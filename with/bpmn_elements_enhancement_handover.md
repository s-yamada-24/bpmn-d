# BPMN要素拡張実装の引き継ぎ

**日時**: 2025-11-22 12:21  
**担当**: エージェント  
**宛先**: 全エージェント  
**ステータス**: 🔄 Phase 1 途中

## 📋 実装状況

### ✅ 完了した作業

1. **実装計画作成** (`with/bpmn_elements_enhancement_plan.md`)
   - 7つの修正要望を整理
   - 実装順序を定義

2. **index.html修正** ✅
   - Data InputとData Outputを削除
   - 単一のData Object要素に統合

### ⚠️ 進行中の作業

3. **CSS修正** (elements.css) - 破損により中断
   - アクティビティサイズ変更: 120px×80px → 200px×100px
   - Data要素のスタイル統合が必要

## 🔧 次に必要な作業

### Phase 1: CSS修正 (残り)
- `css/elements.css` の修正
  - アクティビティサイズを200px×100pxに変更
  - `.data-input`, `.data-output` を `.data-object` に統合
  - 破損したCSSファイルの修復

### Phase 2: app.js修正
- Data要素の統合処理
  - `data-input`, `data-output` を `data-object` に統一
  - 既存のData要素の処理を確認・修正

### Phase 3: プロパティ追加
- イベント要素: `timing`, `method` (複数行)
- アクティビティ要素: `code`, `effort`, `method` (複数行)
- ゲートウェイ要素: `decision` (複数行)
- 接続線: `textAlignH`, `textAlignV`

### Phase 4: プロパティパネル修正
- `updatePropertiesPanel` 関数の拡張
- 複数行テキストエリアの追加
- セレクタの追加(接続線の位置調整)

### Phase 5: 接続線テキスト位置反映
- テキスト位置プロパティに基づいて表示位置を調整

### Phase 6: エクスポート機能対応
- JSON/BPMN XML/PNG すべてに新プロパティを反映

## 📝 重要な注意事項

### Data要素の統合
```javascript
// 削除対象
- data-input
- data-output

// 新規統一
+ data-object
```

### アクティビティサイズ
```css
/* 変更前 */
width: 120px;
height: 80px;

/* 変更後 */
width: 200px;
height: 100px;
```

### 新プロパティ構造

#### イベント
```javascript
{
    timing: string,      // 新規: 複数行
    method: string,      // 新規: 複数行
}
```

#### アクティビティ
```javascript
{
    code: string,        // 新規
    effort: string,      // 新規
    method: string,      // 新規: 複数行
}
```

#### ゲートウェイ
```javascript
{
    decision: string,    // 新規: 複数行
}
```

#### 接続線
```javascript
{
    textAlignH: 'left' | 'center' | 'right',     // 新規
    textAlignV: 'top' | 'center' | 'bottom',     // 新規
}
```

## 🚨 現在の問題

1. **elements.css が破損**
   - 修正中にファイルが破損
   - 完全な書き直しが必要

2. **icons.js の確認が必要**
   - data-object アイコンが定義されているか確認
   - 必要に応じて追加

## 📂 関連ファイル

- ✅ `index.html` (完了)
- ⚠️ `css/elements.css` (破損・要修復)
- ⏳ `js/app.js` (未着手)
- ⏳ `js/icons.js` (確認必要)
- ⏳ `js/exporter.js` (未着手)

---

**次のエージェントへ**:  
elements.cssの修復から開始してください。アクティビティサイズとData要素の統合を完了させ、Phase 2以降に進んでください。
