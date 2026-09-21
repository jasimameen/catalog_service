import 'package:flutter/material.dart';

import '../models/order.dart';
import '../state/app_state.dart';
import '../state/app_state_scope.dart';
import '../theme/app_theme.dart';
import '../widgets/status_pill.dart';
import '../widgets/store_strip.dart';
import '../widgets/ticket_card.dart';
import 'app_shell.dart';
import 'order_detail_screen.dart';

enum _StatusFilter { all, newOrder, kitchen, ready, done }

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  _StatusFilter _filter = _StatusFilter.all;
  String? _fulfillmentFilter; // "dine_in" | "pickup" | "delivery" | null
  String? _selectedOrderId;

  List<CatalogOrder> _filtered(AppState state) {
    Iterable<CatalogOrder> list = state.orders;
    switch (_filter) {
      case _StatusFilter.all:
        break;
      case _StatusFilter.newOrder:
        list = list.where((o) => o.lane == OrderLane.newOrder);
        break;
      case _StatusFilter.kitchen:
        list = list.where((o) => o.lane == OrderLane.kitchen);
        break;
      case _StatusFilter.ready:
        list = list.where((o) => o.lane == OrderLane.ready);
        break;
      case _StatusFilter.done:
        list = list.where((o) => o.lane == OrderLane.done);
        break;
    }
    if (_fulfillmentFilter != null) {
      list = list.where((o) => o.fulfillment == _fulfillmentFilter);
    }
    return list.toList();
  }

  @override
  Widget build(BuildContext context) {
    final state = AppStateScope.of(context);
    return LayoutBuilder(
      builder: (context, constraints) {
        final isTablet = constraints.maxWidth >= kTabletBreakpoint;
        return isTablet ? _buildBoard(context, state) : _buildList(context, state);
      },
    );
  }

  // ---- Phone: vertical list ------------------------------------------------
  Widget _buildList(BuildContext context, AppState state) {
    final orders = _filtered(state);
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          StoreStrip(state: state),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
            child: Text('Orders', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
          ),
          SizedBox(
            height: 44,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 8),
              children: [
                _chip('All · ${state.orders.length}', _filter == _StatusFilter.all,
                    () => setState(() => _filter = _StatusFilter.all)),
                _chip('New · ${state.newOrders.length}', _filter == _StatusFilter.newOrder,
                    () => setState(() => _filter = _StatusFilter.newOrder), color: AppColors.newOrder),
                _chip('Kitchen · ${state.preparingOrders.length}', _filter == _StatusFilter.kitchen,
                    () => setState(() => _filter = _StatusFilter.kitchen)),
                _chip('Ready · ${state.readyOrders.length}', _filter == _StatusFilter.ready,
                    () => setState(() => _filter = _StatusFilter.ready)),
                _chip('Done · ${state.doneOrders.length}', _filter == _StatusFilter.done,
                    () => setState(() => _filter = _StatusFilter.done)),
              ],
            ),
          ),
          SizedBox(
            height: 36,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
              children: [
                _typeChip('All types', _fulfillmentFilter == null, () => setState(() => _fulfillmentFilter = null)),
                _typeChip('Dine-in', _fulfillmentFilter == 'dine_in',
                    () => setState(() => _fulfillmentFilter = 'dine_in')),
                _typeChip('Pickup', _fulfillmentFilter == 'pickup',
                    () => setState(() => _fulfillmentFilter = 'pickup')),
                _typeChip('Delivery', _fulfillmentFilter == 'delivery',
                    () => setState(() => _fulfillmentFilter = 'delivery')),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.border),
          Expanded(
            child: orders.isEmpty
                ? const Center(child: Text('No orders match this filter', style: TextStyle(color: AppColors.textFaint)))
                : ListView.separated(
                    padding: const EdgeInsets.all(20),
                    itemCount: orders.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 12),
                    itemBuilder: (context, i) {
                      final order = orders[i];
                      return TicketCard(
                        order: order,
                        state: state,
                        onOpen: () => Navigator.of(context)
                            .push(MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: order.id))),
                        onPrimaryAction: () => state.advanceStatus(order.id),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _chip(String label, bool active, VoidCallback onTap, {Color? color}) {
    final fg = active ? (color ?? AppColors.text) : AppColors.textDim;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: active ? (color != null ? color.withValues(alpha: 0.12) : AppColors.text) : AppColors.surface,
            border: Border.all(color: active ? (color ?? AppColors.text) : AppColors.border),
            borderRadius: BorderRadius.circular(999),
          ),
          alignment: Alignment.center,
          child: Text(label,
              style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: active && color == null ? Colors.white : fg)),
        ),
      ),
    );
  }

  Widget _typeChip(String label, bool active, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
          decoration: BoxDecoration(
            color: active ? AppColors.surface2 : Colors.transparent,
            borderRadius: BorderRadius.circular(999),
          ),
          alignment: Alignment.center,
          child: Text(label,
              style: TextStyle(
                  fontSize: 12, fontWeight: FontWeight.w600, color: active ? AppColors.text : AppColors.textFaint)),
        ),
      ),
    );
  }

  // ---- Tablet: 4-lane board + master-detail --------------------------------
  Widget _buildBoard(BuildContext context, AppState state) {
    final selectedId = _selectedOrderId ?? (state.newOrders.isNotEmpty ? state.newOrders.first.id : null);
    final selected = selectedId != null ? state.orderById(selectedId) : null;

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          StoreStrip(
            state: state,
            trailing: Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Icon(Icons.campaign_outlined,
                  color: state.pendingTableRequests.isNotEmpty ? AppColors.request : AppColors.textDim),
            ),
          ),
          Expanded(
            child: Row(
              children: [
                Expanded(
                  child: Row(
                    children: [
                      _lane('New', AppColors.newOrder, state.newOrders, state, selectedId, (id) => setState(() => _selectedOrderId = id)),
                      _lane('In kitchen', AppColors.preparing, state.preparingOrders, state, selectedId, (id) => setState(() => _selectedOrderId = id)),
                      _lane('Ready', AppColors.ready, state.readyOrders, state, selectedId, (id) => setState(() => _selectedOrderId = id)),
                      _lane('Done', AppColors.done, state.doneOrders, state, selectedId, (id) => setState(() => _selectedOrderId = id), showBorder: false),
                    ],
                  ),
                ),
                Container(
                  width: 380,
                  decoration: const BoxDecoration(
                    color: AppColors.surface,
                    border: Border(left: BorderSide(color: AppColors.border)),
                  ),
                  child: selected == null
                      ? const Center(child: Text('Select a ticket', style: TextStyle(color: AppColors.textFaint)))
                      : _DetailPane(order: selected, state: state),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _lane(
    String title,
    Color color,
    List<CatalogOrder> orders,
    AppState state,
    String? selectedId,
    ValueChanged<String> onSelect, {
    bool showBorder = true,
  }) {
    return Expanded(
      child: Container(
        decoration: BoxDecoration(
          border: showBorder ? const Border(right: BorderSide(color: AppColors.border)) : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
              decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.border))),
              child: Row(
                children: [
                  Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                  const SizedBox(width: 8),
                  Text(title.toUpperCase(),
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textDim, letterSpacing: 0.4)),
                  const Spacer(),
                  Text('${orders.length}', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: color)),
                ],
              ),
            ),
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.all(10),
                itemCount: orders.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (context, i) {
                  final order = orders[i];
                  return TicketCard(
                    order: order,
                    state: state,
                    compact: true,
                    selected: order.id == selectedId,
                    onOpen: () => onSelect(order.id),
                    onPrimaryAction: () => state.advanceStatus(order.id),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DetailPane extends StatelessWidget {
  const _DetailPane({required this.order, required this.state});

  final CatalogOrder order;
  final AppState state;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              Row(children: [
                StatusPill(label: order.statusLabel, lane: order.lane),
                const SizedBox(width: 8),
                Text('${fulfillmentLabel(order.fulfillment)} · #${order.reference}',
                    style: const TextStyle(fontSize: 12, color: AppColors.textDim, fontWeight: FontWeight.w600)),
              ]),
              const SizedBox(height: 14),
              Text(order.heroLabel, style: const TextStyle(fontSize: 48, fontWeight: FontWeight.w700, height: 1.0)),
              const SizedBox(height: 8),
              Text('${order.itemCount} items', style: const TextStyle(fontSize: 13, color: AppColors.textFaint)),
              const SizedBox(height: 18),
              const Divider(color: AppColors.border),
              const SizedBox(height: 14),
              ...order.items.map((item) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text('${item.qty}× ${item.name}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  )),
              if (order.notes != null && order.notes!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: AppColors.surface2, borderRadius: BorderRadius.circular(12)),
                  child: Text('"${order.notes}"', style: const TextStyle(fontSize: 13, color: AppColors.textDim)),
                ),
              ],
            ],
          ),
        ),
        if (!order.isDone)
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
            child: SizedBox(
              width: double.infinity,
              height: 64,
              child: ElevatedButton(
                onPressed: () => state.advanceStatus(order.id),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: Text(state.nextActionLabel(order), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              ),
            ),
          ),
      ],
    );
  }
}
