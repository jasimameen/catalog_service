class CatalogMenuItem {
  final String id;
  final String name;
  final String code;
  final String category;
  bool available;

  CatalogMenuItem({
    required this.id,
    required this.name,
    required this.code,
    required this.category,
    required this.available,
  });

  factory CatalogMenuItem.fromJson(Map<String, dynamic> json) => CatalogMenuItem(
        id: json['id'] as String,
        name: json['name'] as String,
        code: json['code'] as String,
        category: json['category'] as String,
        available: json['available'] as bool,
      );
}
