# PNG Export機能改善完了

**From:** エージェント  
**To:** Erina  
**Date:** 2025-11-22T13:31:00+09:00

## ✅ 修正内容

### 対応した問題

#### 1. 接続線テキストがPNG出力されない ✅
**症状**: PNG Export時に接続線のテキストが表示されない  
**原因**: exporter.jsのdrawConnection関数でテキスト描画処理が未実装  
**対策**: テキスト描画処理を追加

#### 2. SystemObjectアイコンがPNG出力されない ✅
**症状**: PNG Export時にSystemObjectの歯車アイコンが表示されない  
**原因**: アイコンサイズが小さすぎた(30%)  
**対策**: アイコンサイズを45%に拡大

#### 3. DataObjectアイコンがPNG出力されない ✅
**症状**: PNG Export時にDataObjectのドキュメントアイコンが表示されない  
**原因**: アイコン描画処理が未実装  
**対策**: ドキュメントアイコンの描画処理を追加(45%サイズ)

## 🔧 実装詳細

### 1. 接続線テキストの描画 (exporter.js: 684-760行目)

```javascript
// Draw connection text if exists
if (conn.name) {
    ctx.save();

    // Calculate text position (center of the connection)
    let lx, ly;
    if (conn.midPoint) {
        // midPointを考慮した位置計算
        // Pool相対座標にも対応
    } else {
        lx = (p1.x + p2.x) / 2;
        ly = (p1.y + p2.y) / 2;
    }

    // Apply text alignment offsets
    const textAlignH = conn.textAlignH || 'center';
    const textAlignV = conn.textAlignV || 'center';
    const offsetDistance = 20;

    // 水平・垂直位置調整を適用
    if (textAlignH === 'left') lx -= offsetDistance;
    else if (textAlignH === 'right') lx += offsetDistance;

    if (textAlignV === 'top') ly -= offsetDistance;
    else if (textAlignV === 'bottom') ly += offsetDistance;

    // Draw text background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(...);

    // Draw text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 212, 255, 0.5)';
    ctx.shadowBlur = 3;
    ctx.fillText(conn.name, lx, ly);

    ctx.restore();
}
```

### 2. DataObjectアイコンの描画 (exporter.js: 1032-1065行目)

```javascript
// Draw document icon (45% size to match CSS)
const cx = x + width / 2;
const cy = y + height / 2;
const iconWidth = width * 0.45;
const iconHeight = height * 0.45;
const iconX = cx - iconWidth / 2;
const iconY = cy - iconHeight / 2;

ctx.save();
ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
ctx.lineWidth = 1.5;
ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
ctx.shadowBlur = 2;

// Document outline
ctx.beginPath();
ctx.moveTo(iconX, iconY);
ctx.lineTo(iconX + iconWidth * 0.7, iconY);
ctx.lineTo(iconX + iconWidth, iconY + iconHeight * 0.3);
ctx.lineTo(iconX + iconWidth, iconY + iconHeight);
ctx.lineTo(iconX, iconY + iconHeight);
ctx.closePath();
ctx.stroke();

// Folded corner line
ctx.beginPath();
ctx.moveTo(iconX + iconWidth * 0.7, iconY);
ctx.lineTo(iconX + iconWidth * 0.7, iconY + iconHeight * 0.3);
ctx.lineTo(iconX + iconWidth, iconY + iconHeight * 0.3);
ctx.stroke();

ctx.restore();
```

### 3. SystemObjectアイコンサイズ調整 (exporter.js: 1083行目)

```javascript
// 変更前
const iconSize = Math.min(width, height) * 0.3;

// 変更後
const iconSize = Math.min(width, height) * 0.45;
```

## 🎯 効果

### 接続線テキスト
- ✅ PNG Export時に接続線のテキストが正しく表示される
- ✅ テキスト位置調整(textAlignH/textAlignV)が反映される
- ✅ Pool相対座標にも対応
- ✅ テキスト背景が追加され、視認性が向上

### DataObjectアイコン
- ✅ PNG Export時にドキュメントアイコンが表示される
- ✅ アイコンサイズが45%でキャンバス表示と一致
- ✅ 折り返し部分も正しく描画される

### SystemObjectアイコン
- ✅ PNG Export時に歯車アイコンが正しいサイズで表示される
- ✅ アイコンサイズが45%でキャンバス表示と一致
- ✅ 視認性が向上

## 📝 テスト項目

### 接続線テキスト
1. ✅ 接続線にテキストを設定
2. ✅ PNG Export実行
3. ✅ テキストが正しい位置に表示されることを確認
4. ✅ テキスト位置調整(9パターン)が反映されることを確認

### DataObject
1. ✅ DataObjectを配置
2. ✅ PNG Export実行
3. ✅ ドキュメントアイコンが表示されることを確認

### SystemObject
1. ✅ SystemObjectを配置
2. ✅ PNG Export実行
3. ✅ 歯車アイコンが適切なサイズで表示されることを確認

## 📂 変更ファイル

- `js/exporter.js` (修正)
  - `drawConnection` 関数: 接続線テキスト描画処理追加
  - `drawDataObject` 関数: ドキュメントアイコン描画処理追加
  - `drawSystemObject` 関数: アイコンサイズ調整(30% → 45%)

## 🔗 関連する修正計画

この修正は `with/png_export_fixes_plan.md` の以下の項目に対応しています:

> ### 3. 接続線テキストがPNG出力されない ✅
> **症状**: PNG Export時に接続線のテキストが表示されない  
> **対策**: テキスト描画処理を追加

> ### 4. SystemObjectアイコンがPNG出力されない ✅
> **症状**: PNG Export時にSystemObjectの歯車アイコンが表示されない  
> **対策**: SVG描画処理を追加

> ### 5. DataObjectアイコンが大きい ✅
> **対策**: CSSでアイコンサイズを調整 + PNG出力対応

## 📊 残りの修正項目

`png_export_fixes_plan.md`の残りの項目:
1. ⏳ 接続線の矢印のズレ修正
2. ⏳ 接続線テキスト位置調整の改善(可動範囲拡大)

---

**ステータス**: ✅ 完了  
**対応項目**: 3つ  
**次のアクション**: ユーザーによる動作確認
