import 'package:flutter/material.dart';

import '../models/menu_item.dart';
import '../state/app_state.dart';
import '../state/app_state_scope.dart';
import '../theme/app_theme.dart';

class MenuScreen extends StatefulWidget {
  const MenuScreen({super.key});

  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> {
  String _category = 'All';
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final state = AppStateScope.of(context);
    final items = state.menuByCategory(_category == 'All' ? null : _category).where((m) {
      if (_query.isEmpty) return true;
      return m.name.toLowerCase().contains(_query.toLowerCase());
    }).toList();

    final byCategory = <String, List<CatalogMenuItem>>{};
    for (final item in items) {
      byCategory.putIfAbsent(item.category, () => []).add(item);
    }

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
            child: Row(
              children: [
                const Text('Menu', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
                const Spacer(),
                Text('${state.menuItems.length} items', style: const TextStyle(fontSize: 13, color: AppColors.textFaint, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
            child: Container(
              height: 46,
              decoration: BoxDecoration(
                color: AppColors.surface,
                border: Border.all(color: AppColors.borderStrong),
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Row(
                children: [
                  const Icon(Icons.search, size: 18, color: AppColors.textDim),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      onChanged: (v) => setState(() => _query = v),
                      decoration: const InputDecoration(border: InputBorder.none, hintText: 'Search menu items'),
                    ),
                  ),
                ],
              ),
            ),
          ),
          SizedBox(
            height: 40,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
              children: state.categories.map((c) {
                final active = c == _category;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: InkWell(
                    onTap: () => setState(() => _category = c),
                    borderRadius: BorderRadius.circular(999),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                      decoration: BoxDecoration(
                        color: active ? AppColors.text : AppColors.surface,
                        border: Border.all(color: active ? AppColors.text : AppColors.border),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(c,
                          style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: active ? Colors.white : AppColors.textDim)),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const Divider(height: 1, color: AppColors.border),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 6, 20, 24),
              children: [
                ...byCategory.entries.expand((entry) => [
                      if (!(_category == 'All' && _query.isEmpty))
                        const SizedBox.shrink()
                      else
                        _sectionLabel(entry.key),
                      ...entry.value.map((item) => _menuRow(state, item)),
                    ]),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionLabel(String text) => Padding(
        padding: const EdgeInsets.only(top: 14, bottom: 8),
        child: Text(text.toUpperCase(),
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textDim, letterSpacing: 0.4)),
      );

  Widget _menuRow(AppState state, CatalogMenuItem item) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.border))),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                Text('${item.code} · ${item.category}', style: const TextStyle(fontSize: 12, color: AppColors.textFaint)),
              ],
            ),
          ),
          SizedBox(
            width: 118,
            height: 44,
            child: OutlinedButton(
              onPressed: () => state.toggleAvailability(item.id),
              style: OutlinedButton.styleFrom(
                backgroundColor: item.available ? AppColors.readyBg : AppColors.cancelledBg,
                foregroundColor: item.available ? AppColors.ready : AppColors.cancelled,
                side: BorderSide(color: item.available ? AppColors.ready : AppColors.cancelled, width: 1.5),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: Text(item.available ? 'Available' : 'Sold out', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
            ),
          ),
        ],
      ),
    );
  }
}
