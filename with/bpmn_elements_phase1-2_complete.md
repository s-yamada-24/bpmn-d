# BPMN要素拡張実装 - Phase 1-2 完了報告

**日時**: 2025-11-22 12:26  
**担当**: エージェント  
**宛先**: 全エージェント

## ✅ 完了した作業

### Phase 1: パレットとCSS修正 ✅
1. **index.html修正** ✅
   - Data InputとData Outputを削除
   - 単一のData Object要素に統合

2. **elements.css完全書き直し** ✅
   - アクティビティサイズを200px×100pxに変更
   - Data要素を統合(data-input/data-outputをdata-objectに)
   - 破損したCSSファイルを修復

3. **icons.js修正** ✅
   - dataInputとdataOutputアイコンを削除
   - dataObjectアイコンを追加

### Phase 2: app.js確認 ✅
- `createBPMNElement`関数を確認
- type引数がそのままクラスとして使用されるため、Data要素の統合は自動的に対応済み
- 特別な修正は不要

## 🔄 次のフェーズ: Phase 3-6

### Phase 3: プロパティ追加 (進行中)
`updatePropertiesPanel`関数の拡張が必要:

#### イベント要素
- `timing` (複数行テキストエリア)
- `method` (複数行テキストエリア)

#### アクティビティ要素
- `code` (テキスト入力)
- `effort` (テキスト入力)
- `method` (複数行テキストエリア)

#### ゲートウェイ要素
- `decision` (複数行テキストエリア)

#### 接続線
- `textAlignH` (セレクタ: left, center, right)
- `textAlignV` (セレクタ: top, center, bottom)

### Phase 4: プロパティパネルUI実装
- 各要素タイプに応じたプロパティフィールドを追加
- イベントリスナーの設定
- データの保存・復元

### Phase 5: 接続線テキスト位置反映
- textAlignH/textAlignVに基づいてテキスト表示位置を調整
- updateConnectionPath関数の修正

### Phase 6: エクスポート機能対応
- JSON/BPMN XML/PNG すべてに新プロパティを反映
- exporter.jsの修正

## 📊 実装の詳細

### updatePropertiesPanel関数の構造
- **行1098-1184**: プール選択時の処理
- **行1186-1222**: 接続線選択時の処理
- **行1224-1278**: 要素選択時の処理

### 必要な修正箇所

#### 1. 要素のプロパティ追加 (行1233-1251)
現在:
```javascript
panel.innerHTML = `
    <div class="property-group">Type</div>
    <div class="property-group">Name</div>
    <div class="property-group">Memo</div>
`;
```

修正後:
```javascript
// イベント要素の場合
if (type.includes('event')) {
    // + timing, method フィールド
}
// アクティビティ要素の場合
if (type.includes('task')) {
    // + code, effort, method フィールド
}
// ゲートウェイ要素の場合
if (type.includes('gateway')) {
    // + decision フィールド
}
```

#### 2. 接続線のプロパティ追加 (行1189-1205)
現在:
```javascript
panel.innerHTML = `
    <div class="property-group">Type</div>
    <div class="property-group">Name</div>
    <div class="property-group">Memo</div>
`;
```

修正後:
```javascript
panel.innerHTML = `
    <div class="property-group">Type</div>
    <div class="property-group">Name</div>
    <div class="property-group">Text Align H</div>  // 新規
    <div class="property-group">Text Align V</div>  // 新規
    <div class="property-group">Memo</div>
`;
```

#### 3. データの保存
- dataset属性を使用: `el.dataset.timing`, `el.dataset.method`, etc.
- 接続線: `conn.textAlignH`, `conn.textAlignV`

## 🎯 次のステップ

1. updatePropertiesPanel関数を拡張
2. 新プロパティのイベントリスナーを追加
3. 接続線テキスト位置の反映ロジックを実装
4. エクスポート機能を更新

---

**ステータス**: 🔄 Phase 3 開始準備完了  
**次の担当者へ**: updatePropertiesPanel関数の拡張から開始してください
