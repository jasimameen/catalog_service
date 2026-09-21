class TableRequestItem {
  final String id;
  final String? tableNo;
  final String kind; // "waiter" | "bill"
  final String? note;
  final String createdAt;
  final String? resolvedAt;

  const TableRequestItem({
    required this.id,
    this.tableNo,
    required this.kind,
    this.note,
    required this.createdAt,
    this.resolvedAt,
  });

  bool get isResolved => resolvedAt != null;

  factory TableRequestItem.fromJson(Map<String, dynamic> json) => TableRequestItem(
        id: json['id'] as String,
        tableNo: json['table_no'] as String?,
        kind: json['kind'] as String,
        note: json['note'] as String?,
        createdAt: json['created_at'] as String,
        resolvedAt: json['resolved_at'] as String?,
      );
}
