# BPMN要素とプロパティの拡張実装計画

**日時**: 2025-11-22 12:21  
**担当**: エージェント  
**宛先**: 全エージェント

## 📋 修正要望一覧

### 1. Data要素の統合
- ❌ Data Output / Data Input を削除
- ✅ Data 要素に一本化

### 2. イベント要素のプロパティ拡張
- ✅ タイミング (複数行対応)
- ✅ 手段 (複数行対応)

### 3. アクティビティ要素のプロパティ拡張
- ✅ コード
- ✅ 工数
- ✅ 手段 (複数行対応)

### 4. ゲートウェイ要素のプロパティ拡張
- ✅ 判断内容 (複数行対応)

### 5. 接続線のテキスト位置調整機能
- ✅ 水平位置: 左、中央、右
- ✅ 垂直位置: 上、中央、下
- ✅ プロパティパネルにセレクタ追加
- ✅ テキスト表示に反映

### 6. アクティビティ要素のサイズ変更
- ✅ 幅: 120px → 200px
- ✅ 高さ: 80px → 100px

### 7. エクスポート機能の対応
- ✅ JSON/BPMN XML/PNG すべてに対応

## 🗂️ 実装順序

### Phase 1: パレットとCSS修正
1. `index.html` - パレットからData Output/Input削除、Dataに統合
2. `css/elements.css` - アクティビティサイズ変更、Data要素スタイル調整

### Phase 2: app.js修正
3. `js/app.js` - Data要素の統合処理
4. `js/app.js` - 各要素のプロパティ追加
5. `js/app.js` - 接続線のテキスト位置プロパティ追加

### Phase 3: プロパティパネル修正
6. `js/app.js` - updatePropertiesPanel関数の拡張
7. `js/app.js` - 接続線のテキスト位置反映ロジック

### Phase 4: エクスポート機能対応
8. `js/exporter.js` - JSON/BPMN XML/PNG対応

## 📝 詳細仕様

### Data要素の統合
```javascript
// 削除: data-input, data-output
// 追加: data-object (単一)
```

### プロパティ構造

#### イベント
```javascript
{
    id: string,
    type: 'start-event' | 'end-event' | 'intermediate-event',
    label: string,
    timing: string,      // 新規: 複数行
    method: string,      // 新規: 複数行
    memo: string
}
```

#### アクティビティ
```javascript
{
    id: string,
    type: 'task' | 'user-task' | 'service-task',
    label: string,
    code: string,        // 新規
    effort: string,      // 新規
    method: string,      // 新規: 複数行
    memo: string
}
```

#### ゲートウェイ
```javascript
{
    id: string,
    type: 'exclusive-gateway' | 'parallel-gateway',
    label: string,
    decision: string,    // 新規: 複数行
    memo: string
}
```

#### 接続線
```javascript
{
    id: string,
    name: string,
    textAlignH: 'left' | 'center' | 'right',     // 新規
    textAlignV: 'top' | 'center' | 'bottom',     // 新規
    memo: string
}
```

## 🎨 CSS変更

### アクティビティサイズ
```css
/* 修正前 */
.bpmn-element.task,
.bpmn-element.user-task,
.bpmn-element.service-task {
    width: 120px;
    height: 80px;
}

/* 修正後 */
.bpmn-element.task,
.bpmn-element.user-task,
.bpmn-element.service-task {
    width: 200px;
    height: 100px;
}
```

---

**ステータス**: 📝 計画中  
**次のステップ**: Phase 1から順次実装開始
