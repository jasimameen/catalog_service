import 'package:flutter/material.dart';

import '../models/order.dart';
import '../services/api_client.dart';
import '../state/app_state.dart';
import '../state/app_state_scope.dart';
import '../theme/app_theme.dart';
import '../widgets/status_pill.dart';

class OrderDetailScreen extends StatefulWidget {
  const OrderDetailScreen({super.key, required this.orderId});

  final String orderId;

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  CatalogOrder? _order;
  List<TimelineEvent> _timeline = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await ApiClient.instance.get('/api/mobile/orders/${widget.orderId}');
      setState(() {
        _order = CatalogOrder.fromJson(data['order'] as Map<String, dynamic>);
        _timeline = (data['timeline'] as List<dynamic>)
            .map((e) => TimelineEvent.fromJson(e as Map<String, dynamic>))
            .toList();
        _loading = false;
      });
    } catch (error) {
      setState(() {
        _error = error is ApiException ? error.message : "Couldn't load this order.";
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = AppStateScope.of(context);

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.border))),
              child: Row(
                children: [
                  IconButton(onPressed: () => Navigator.of(context).pop(), icon: const Icon(Icons.arrow_back)),
                  Text('Order #${_order?.reference ?? ''}',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textDim)),
                  const Spacer(),
                  if (_order != null)
                    PopupMenuButton<String>(
                      icon: const Icon(Icons.more_horiz),
                      onSelected: (v) {
                        if (v == 'cancel') {
                          state.cancelOrder(_order!.id);
                          Navigator.of(context).pop();
                        }
                      },
                      itemBuilder: (_) => const [
                        PopupMenuItem(value: 'cancel', child: Text('Cancel order')),
                      ],
                    ),
                ],
              ),
            ),
            if (_loading) const Expanded(child: Center(child: CircularProgressIndicator()))
            else if (_error != null)
              Expanded(
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(_error!, style: const TextStyle(color: AppColors.textDim)),
                      const SizedBox(height: 12),
                      OutlinedButton(onPressed: _load, child: const Text('Retry')),
                    ],
                  ),
                ),
              )
            else
              Expanded(child: _buildBody(context, state, _order!)),
          ],
        ),
      ),
    );
  }

  Widget _buildBody(BuildContext context, AppState state, CatalogOrder order) {
    final isDelivery = order.isDelivery;

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
            children: [
              Row(
                children: [
                  StatusPill(label: order.statusLabel, lane: order.lane),
                  const SizedBox(width: 8),
                  Text(fulfillmentLabel(order.fulfillment),
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textDim)),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                isDelivery ? order.location : order.heroLabel,
                style: TextStyle(fontSize: isDelivery ? 30 : 60, fontWeight: FontWeight.w700, height: 1.1),
              ),
              const SizedBox(height: 6),
              Text('${order.itemCount} items · ${order.reference}',
                  style: const TextStyle(fontSize: 13, color: AppColors.textFaint, fontWeight: FontWeight.w600)),
              if (isDelivery) ...[
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: OutlinedButton.icon(
                    onPressed: order.mapsLink == null ? null : () {},
                    icon: const Icon(Icons.map_outlined),
                    label: const Text('Open in Maps', style: TextStyle(fontWeight: FontWeight.w700)),
                    style: OutlinedButton.styleFrom(
                      backgroundColor: AppColors.surface,
                      side: const BorderSide(color: AppColors.borderStrong),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(14)),
                  child: Row(
                    children: [
                      const CircleAvatar(
                          backgroundColor: AppColors.surface2,
                          child: Icon(Icons.person_outline, color: AppColors.textDim)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(order.shopName, style: const TextStyle(fontWeight: FontWeight.w600)),
                            const Text('Customer', style: TextStyle(fontSize: 12, color: AppColors.textFaint)),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () {},
                        style: IconButton.styleFrom(backgroundColor: AppColors.readyBg),
                        icon: const Icon(Icons.call, color: AppColors.ready, size: 18),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 20),
              const Divider(color: AppColors.border),
              const SizedBox(height: 12),
              ...order.items.map((item) => Padding(
                    padding: const EdgeInsets.only(bottom: 14),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text('${item.qty} × ${item.name}',
                              style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w600)),
                        ),
                        if (item.notes != null)
                          Text(item.notes!, style: const TextStyle(fontSize: 13, color: AppColors.textFaint)),
                      ],
                    ),
                  )),
              if (order.notes != null && order.notes!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(14)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('GUEST NOTE',
                          style: TextStyle(
                              fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textDim, letterSpacing: 0.4)),
                      const SizedBox(height: 6),
                      Text('"${order.notes}"', style: const TextStyle(fontSize: 15, height: 1.4)),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 20),
              const Divider(color: AppColors.border),
              const SizedBox(height: 12),
              const Text('TIMELINE',
                  style: TextStyle(
                      fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textDim, letterSpacing: 0.4)),
              const SizedBox(height: 10),
              ..._timelineWidgets(),
            ],
          ),
        ),
        if (!order.isDone)
          Container(
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 22),
            decoration: const BoxDecoration(
              color: AppColors.bg,
              border: Border(top: BorderSide(color: AppColors.border)),
            ),
            child: Column(
              children: [
                SizedBox(
                  width: double.infinity,
                  height: 68,
                  child: ElevatedButton(
                    onPressed: () async {
                      await state.advanceStatus(order.id);
                      if (mounted) _load();
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                    ),
                    child: Text(order.nextAction?.label ?? 'Done',
                        style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w700)),
                  ),
                ),
                const SizedBox(height: 6),
                TextButton(
                  onPressed: () {
                    state.cancelOrder(order.id);
                    Navigator.of(context).pop();
                  },
                  child: const Text('Cancel order', style: TextStyle(color: AppColors.cancelled, fontWeight: FontWeight.w600)),
                ),
              ],
            ),
          ),
      ],
    );
  }

  List<Widget> _timelineWidgets() {
    if (_timeline.isEmpty) {
      return const [Text('No history yet.', style: TextStyle(color: AppColors.textFaint))];
    }
    return [
      for (int i = 0; i < _timeline.length; i++)
        Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: const BoxDecoration(shape: BoxShape.circle, color: AppColors.newOrder),
                  ),
                  if (i != _timeline.length - 1)
                    Container(width: 2, height: 26, color: AppColors.borderStrong),
                ],
              ),
              const SizedBox(width: 12),
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text('${_timeline[i].toStatus} · ${_timeline[i].actor ?? ''}',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
        ),
    ];
  }
}
