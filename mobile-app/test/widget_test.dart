import 'package:flutter_test/flutter_test.dart';

import 'package:instant_catalog_ops/main.dart';

void main() {
  testWidgets('App boots to the sign-in screen', (WidgetTester tester) async {
    await tester.pumpWidget(const InstantCatalogOpsApp());
    await tester.pumpAndSettle();

    expect(find.text('Sign in'), findsWidgets);
    expect(find.text('Work email'), findsOneWidget);
  });
}
