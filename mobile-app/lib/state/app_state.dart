import 'dart:async';
import 'package:flutter/foundation.dart';

import '../models/menu_item.dart';
import '../models/order.dart';
import '../models/table_request.dart';
import '../services/api_client.dart';
import '../services/sound_service.dart';

/// Single source of truth for the ops app, backed by the real Next.js
/// mobile API (src/app/api/mobile/*) instead of mock data. Screens read
/// from it via [AppStateScope] and rebuild on [notifyListeners].
class AppState extends ChangeNotifier {
  bool isLoading = true;
  String? loadError;

  /// Fired when a poll finds a brand-new ticket/table request — the app
  /// shell uses this to push the full-screen alarm, same as a push
  /// notification would while the app is foregrounded.
  void Function(CatalogOrder order)? onNewOrder;
  void Function(TableRequestItem request)? onNewTableRequest;

  /// Fired when the refresh token itself is no longer valid.
  VoidCallback? onSessionExpired;

  String accountName = '';
  String catalogName = '';

  bool takingOrders = true;
  bool kitchenOpen = true;
  bool runningBehind = false;
  String storefrontAlert = '';

  final List<CatalogOrder> orders = [];
  final List<CatalogMenuItem> menuItems = [];
  final List<TableRequestItem> tableRequests = [];

  bool soundOn = true;
  bool soundNewOrders = true;
  bool soundTableRequests = true;
  double volume = 0.8;

  Timer? _pollTimer;
  final Set<String> _knownOrderIds = {};
  final Set<String> _knownRequestIds = {};

  bool get storeClosed => !takingOrders && !kitchenOpen;

  List<CatalogOrder> get newOrders => orders.where((o) => o.lane == OrderLane.newOrder).toList();
  List<CatalogOrder> get preparingOrders => orders.where((o) => o.lane == OrderLane.kitchen).toList();
  List<CatalogOrder> get readyOrders => orders.where((o) => o.lane == OrderLane.ready).toList();
  List<CatalogOrder> get doneOrders => orders.where((o) => o.lane == OrderLane.done).toList();
  List<TableRequestItem> get pendingTableRequests => tableRequests.where((r) => !r.isResolved).toList();

  CatalogOrder orderById(String id) => orders.firstWhere((o) => o.id == id);

  String nextActionLabel(CatalogOrder order) => order.nextAction?.label ?? 'Done';

  List<String> get categories => ['All', ...{for (final m in menuItems) m.category}];
  List<CatalogMenuItem> menuByCategory(String? category) {
    if (category == null || category == 'All') return menuItems;
    return menuItems.where((m) => m.category == category).toList();
  }

  // ---- Bootstrap & polling ---------------------------------------------------

  Future<void> bootstrap() async {
    isLoading = true;
    loadError = null;
    notifyListeners();
    try {
      final data = await ApiClient.instance.get('/api/mobile/bootstrap');
      accountName = (data['account'] as Map<String, dynamic>)['name'] as String? ?? '';
      final catalog = data['catalog'] as Map<String, dynamic>;
      catalogName = catalog['name'] as String? ?? '';
      takingOrders = catalog['accept_orders'] as bool? ?? true;
      kitchenOpen = catalog['kitchen_open'] as bool? ?? true;
      storefrontAlert = catalog['storefront_alert'] as String? ?? '';
      runningBehind = catalog['show_storefront_alert'] as bool? ?? false;

      await Future.wait([_fetchOrders(seedKnown: true), _fetchMenu(), _fetchServiceRequests(seedKnown: true)]);

      isLoading = false;
      notifyListeners();
      _startPolling();
    } catch (error) {
      isLoading = false;
      loadError = _describe(error);
      notifyListeners();
      if (error is SessionExpiredException) onSessionExpired?.call();
    }
  }

  void _startPolling() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 6), (_) => refreshAll());
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> refreshAll() async {
    try {
      await Future.wait([_fetchOrders(), _fetchServiceRequests()]);
      notifyListeners();
    } on SessionExpiredException {
      _pollTimer?.cancel();
      onSessionExpired?.call();
    } catch (_) {
      // Transient network hiccup — the next poll tick will retry.
    }
  }

  Future<void> _fetchOrders({bool seedKnown = false}) async {
    final data = await ApiClient.instance.get('/api/mobile/orders');
    final fetched =
        (data['orders'] as List<dynamic>).map((o) => CatalogOrder.fromJson(o as Map<String, dynamic>)).toList();

    if (!seedKnown) {
      for (final order in fetched) {
        if (order.lane == OrderLane.newOrder && !_knownOrderIds.contains(order.id)) {
          onNewOrder?.call(order);
        }
      }
    }
    _knownOrderIds
      ..clear()
      ..addAll(fetched.map((o) => o.id));

    orders
      ..clear()
      ..addAll(fetched);
  }

  Future<void> _fetchMenu() async {
    final data = await ApiClient.instance.get('/api/mobile/menu');
    final fetched =
        (data['items'] as List<dynamic>).map((m) => CatalogMenuItem.fromJson(m as Map<String, dynamic>)).toList();
    menuItems
      ..clear()
      ..addAll(fetched);
  }

  Future<void> _fetchServiceRequests({bool seedKnown = false}) async {
    final data = await ApiClient.instance.get('/api/mobile/service-requests');
    final fetched = (data['requests'] as List<dynamic>)
        .map((r) => TableRequestItem.fromJson(r as Map<String, dynamic>))
        .toList();

    if (!seedKnown) {
      for (final request in fetched) {
        if (!request.isResolved && !_knownRequestIds.contains(request.id)) {
          onNewTableRequest?.call(request);
        }
      }
    }
    _knownRequestIds
      ..clear()
      ..addAll(fetched.map((r) => r.id));

    tableRequests
      ..clear()
      ..addAll(fetched);
  }

  String _describe(Object error) {
    if (error is ApiException) return error.message;
    if (error is SessionExpiredException) return 'Session expired. Sign in again.';
    return "Couldn't reach the server. Check your connection.";
  }

  // ---- Store controls ---------------------------------------------------------

  Future<void> togglePause() => _patchStoreSettings(acceptOrders: !takingOrders);
  Future<void> toggleKitchen() => _patchStoreSettings(kitchenOpen: !kitchenOpen);
  Future<void> closeRestaurant() => _patchStoreSettings(acceptOrders: false, kitchenOpen: false);
  Future<void> resumeRestaurant() => _patchStoreSettings(acceptOrders: true, kitchenOpen: true);
  Future<void> setRunningBehind(bool value) => _patchStoreSettings(showAlert: value);

  Future<void> _patchStoreSettings({bool? acceptOrders, bool? kitchenOpen, bool? showAlert}) async {
    final prevTaking = takingOrders;
    final prevKitchen = this.kitchenOpen;
    final prevAlert = runningBehind;
    if (acceptOrders != null) takingOrders = acceptOrders;
    if (kitchenOpen != null) this.kitchenOpen = kitchenOpen;
    if (showAlert != null) runningBehind = showAlert;
    notifyListeners();

    try {
      await ApiClient.instance.post('/api/mobile/store-settings', {
        'accept_orders': ?acceptOrders,
        'kitchen_open': ?kitchenOpen,
        'show_storefront_alert': ?showAlert,
      });
    } catch (_) {
      takingOrders = prevTaking;
      this.kitchenOpen = prevKitchen;
      runningBehind = prevAlert;
      notifyListeners();
    }
  }

  // ---- Orders --------------------------------------------------------------------

  Future<void> advanceStatus(String id) async {
    try {
      await ApiClient.instance.post('/api/mobile/orders/$id/status');
      await _fetchOrders();
      notifyListeners();
    } on SessionExpiredException {
      onSessionExpired?.call();
    } catch (_) {
      // Leave the ticket as-is; the user can retry the tap.
    }
  }

  Future<void> cancelOrder(String id) async {
    try {
      await ApiClient.instance.post('/api/mobile/orders/$id/cancel');
      await _fetchOrders();
      notifyListeners();
    } catch (_) {}
  }

  // ---- Menu ------------------------------------------------------------------------

  Future<void> toggleAvailability(String id) async {
    final item = menuItems.firstWhere((m) => m.id == id);
    final prev = item.available;
    item.available = !prev;
    notifyListeners();
    try {
      await ApiClient.instance.post('/api/mobile/menu/$id/availability', {'available': item.available});
    } catch (_) {
      item.available = prev;
      notifyListeners();
    }
  }

  // ---- Table requests --------------------------------------------------------------

  Future<void> markTableRequestSeen(String id) async {
    try {
      await ApiClient.instance.post('/api/mobile/service-requests/$id/resolve');
      await _fetchServiceRequests();
      notifyListeners();
    } catch (_) {}
  }

  // ---- Sound (local only — no server setting for this yet) -------------------------

  void setSoundOn(bool v) {
    soundOn = v;
    SoundService.instance.masterOn = v;
    notifyListeners();
  }

  void setSoundNewOrders(bool v) {
    soundNewOrders = v;
    SoundService.instance.newOrdersOn = v;
    notifyListeners();
  }

  void setSoundTableRequests(bool v) {
    soundTableRequests = v;
    SoundService.instance.tableRequestsOn = v;
    notifyListeners();
  }

  void setVolume(double v) {
    volume = v;
    SoundService.instance.volume = v;
    notifyListeners();
  }
}
