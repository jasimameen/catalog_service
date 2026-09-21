/// Board lane, computed server-side (order-statuses.ts's workflowLane) from
/// whatever statuses this catalog has configured — the app never hardcodes
/// a status list, since every merchant can rename/reorder theirs.
enum OrderLane { newOrder, kitchen, ready, done }

OrderLane laneFromString(String value) {
  switch (value) {
    case 'kitchen':
      return OrderLane.kitchen;
    case 'ready':
      return OrderLane.ready;
    case 'done':
      return OrderLane.done;
    default:
      return OrderLane.newOrder;
  }
}

class NextAction {
  final String status;
  final String label;
  const NextAction({required this.status, required this.label});

  factory NextAction.fromJson(Map<String, dynamic> json) =>
      NextAction(status: json['status'] as String, label: json['label'] as String);
}

class OrderLineItem {
  final String id;
  final String name;
  final int qty;
  final String? notes;

  const OrderLineItem({required this.id, required this.name, required this.qty, this.notes});

  factory OrderLineItem.fromJson(Map<String, dynamic> json) => OrderLineItem(
        id: json['id'] as String,
        name: json['name'] as String,
        qty: json['qty'] as int,
        notes: json['notes'] as String?,
      );
}

class TimelineEvent {
  final String? fromStatus;
  final String toStatus;
  final String? actor;
  final String createdAt;

  const TimelineEvent({this.fromStatus, required this.toStatus, this.actor, required this.createdAt});

  factory TimelineEvent.fromJson(Map<String, dynamic> json) => TimelineEvent(
        fromStatus: json['from_status'] as String?,
        toStatus: json['to_status'] as String,
        actor: json['actor'] as String?,
        createdAt: json['created_at'] as String,
      );
}

/// One order ticket, shaped by the mobile API (src/app/api/mobile/orders)
/// straight from the same order-statuses.ts rules the web admin board uses.
class CatalogOrder {
  final String id;
  final String reference;
  final String shopName;
  final String phone;
  final String location;
  final String? mapsLink;
  final String? notes;
  final String? fulfillment; // "dine_in" | "pickup" | "delivery" | null
  final String? tableNo;
  String status;
  String statusLabel;
  OrderLane lane;
  bool isDone;
  NextAction? nextAction;
  final String? claimedAt;
  final String? claimedBy;
  final String createdAt;
  final int itemCount;
  final String itemSummary;
  final List<OrderLineItem> items;

  CatalogOrder({
    required this.id,
    required this.reference,
    required this.shopName,
    required this.phone,
    required this.location,
    this.mapsLink,
    this.notes,
    this.fulfillment,
    this.tableNo,
    required this.status,
    required this.statusLabel,
    required this.lane,
    required this.isDone,
    this.nextAction,
    this.claimedAt,
    this.claimedBy,
    required this.createdAt,
    required this.itemCount,
    required this.itemSummary,
    required this.items,
  });

  bool get isDineIn => fulfillment == 'dine_in';
  bool get isDelivery => fulfillment == 'delivery';

  /// Table number for dine-in, customer/shop name otherwise — the "hero"
  /// field the design puts largest on the card.
  String get heroLabel => isDineIn ? 'Table ${tableNo ?? '?'}' : shopName;

  factory CatalogOrder.fromJson(Map<String, dynamic> json) => CatalogOrder(
        id: json['id'] as String,
        reference: json['reference'] as String,
        shopName: json['shop_name'] as String,
        phone: json['phone'] as String,
        location: json['location'] as String,
        mapsLink: json['maps_link'] as String?,
        notes: json['notes'] as String?,
        fulfillment: json['fulfillment'] as String?,
        tableNo: json['table_no'] as String?,
        status: json['status'] as String,
        statusLabel: json['status_label'] as String,
        lane: laneFromString(json['lane'] as String),
        isDone: json['is_done'] as bool,
        nextAction: json['next_action'] != null
            ? NextAction.fromJson(json['next_action'] as Map<String, dynamic>)
            : null,
        claimedAt: json['claimed_at'] as String?,
        claimedBy: json['claimed_by'] as String?,
        createdAt: json['created_at'] as String,
        itemCount: json['item_count'] as int,
        itemSummary: json['item_summary'] as String,
        items: (json['items'] as List<dynamic>)
            .map((item) => OrderLineItem.fromJson(item as Map<String, dynamic>))
            .toList(),
      );
}
