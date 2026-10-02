# Bridge Header 設計入力標準
## （Header Design Input Standard）

**ステータス**: Accepted
**採用日**: 2026-10-02
**適用範囲**: SOAPエンジン全体（剤形・領域を問わない全 module）
**位置づけ**: Bridge Header を新規設計、または semantic に改修する前に必要な**入力条件**の正本。
PN2（bridge → canonical の転記）より前の工程を対象とし、PN2 の責務ではない。

---

## 0. Purpose / Scope

Header の設計は、generic な原則だけでは足りず、module 固有の**検証済みの Product Fact**を入力として必要とする。
本書は、その入力の要件と、Fact から routing を決めるときの境界を定める。

**対象となる作業**: Bridge Header の新規設計、または意味を変える改修（`brandCatalog`・`handlingTags`・
`scenarioRequiredTags`・`addonRequiredTags`・composition 等）。表記の訂正など semantic でない変更は対象外。

| 本書が担うもの | 本書が担わないもの |
|---|---|
| 検証済みの Product Fact（source / version / verification date） | medical content 本文の正本（正本は bridge） |
| unknown を unknown のまま扱う規則 | Product Variant Level 1/2/3 の定義・判定基準（`docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md`） |
| manufacturer / 剤形 / variant 差の Fact | canonical JSON schema（`docs/JSON_STANDARD.md`） |
| Level 1/2/3 判定へ渡す入力 | PN2 の転記規則（`prompts/vNext/PN2-Drug-Header.md`） |
| 既存 SCENARIO / ADDON への applicability review | runtime / 検索 / UI、新しい pipeline stage |
| deterministic な導出と design judgment の境界 | 臨床判断の AI による自動確定 |
| Human / Owner gate、PENDING / STOP 条件 | — |

---

## 1. Required Product Facts

**routing や Header 設計に影響する Fact のみを必須とする。** 影響しない Fact は要求しない。

| 項目 | 必須となる場面 |
|---|---|
| 製品の同定（正式販売名、承認番号・YJ コード等〔存在する場合〕、有効成分） | 常に |
| 剤形と、**状態ごとの条件**（製品として供給される状態と、患者へ交付される状態が異なる場合は別の行にする。例: 用時溶解製剤） | 状態によって条件が異なるとき |
| 保存・取り扱い条件（状態ごと） | tag や gate の根拠にするとき |
| 添加剤・容器・包装（防腐剤の有無、単回使用、容器の特性） | その性質を gate に使うとき |
| 規格・用法（濃度違い、回数） | 濃度・回数を gate に使うとき |
| family 内の marketed variant、manufacturer 差 | variant を扱うとき |

各 Fact には、**source・document/version/revision（存在する場合）・verification date・性質（§2）**を添える。
表現は Markdown の表と prose を基本とし、新しい YAML / JSON schema は導入しない。module 固有の Fact は、
現行どおり Bridge Header のコメントに記録する。

---

## 2. Fact Discipline

情報を次の 4 つの**性質**に分ける。これは semantic な分類であり、新しい marker の書式ではない
（既存 bridge の `[H]/[P]/[D]` は置換せず、retrofit しない。`[P]` と PENDING は同一視しない）。

| 性質 | 意味 |
|---|---|
| **FACT** | そのことについて authoritative な source で確認でき、再確認できる |
| **OWNER INTENT** | 薬局実務上の Owner 判断。Fact へ昇格させない |
| **ASSUMPTION** | 未確認の仮定。routing の確定に使わない |
| **PENDING** | 追加の確認が必要で、未確定のまま保持する |

**Source rule**: routing や Header 設計に使う Fact は、その Fact について authoritative / official な source
（PMDA 等の公的な一次資料、製造販売元の公式資料など）で確認する。**二次資料のみを根拠に semantic routing
を確定しない。**

**unknown の扱い**: 確認できないことは unknown のまま残す。代表値・先発品の値・類推で補わない。
「資料に記載がない」ことは、その旨として記録する（「存在しない」とは書かない）。

**Freshness**: 固定の再確認期限は設けない。次のいずれかのときに再確認する。
source の改訂が判明した／現在の流通状況が判断に必要／製品・包装・製剤の変更が疑われる／
routing の判断に Fact の鮮度が影響する。

---

## 3. Variant / Family Input Boundary

Level 1/2/3 の定義と判定基準は `docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md` に残す。本書は、
その判定に必要な**検証済みの入力**を揃える責務だけを持つ。

揃える入力: family 内の marketed variant の実在、その variant の property、manufacturer 差の有無、
各 Fact の source / verification date。

**`variant exists` だけでは Level 2 の routing を確定しない。** 既存本文への applicability（§4）も必要である。

---

## 4. Existing Content Applicability Review

**要求する場面**: Product Fact・variant・family の関係を根拠に、既存の SCENARIO または ADDON へ
**新たに routing しようとするとき**。全 SCENARIO / ADDON の恒常的な全文監査は要求しない。

**対象**: その routing によって到達する本文。文または意味の単位で、次のいずれかに分ける。

| 判定 | 意味 |
|---|---|
| **confirmed** | authoritative な source で、その記述が当該製品に当てはまると確認できる |
| **unsupported** | source で当てはまるともそうでないとも確認できない |
| **contradicted** | source の記載と食い違う |

**規則**: `unsupported` または `contradicted` を含む場合、その既存本文への routing を、Fact だけから確定しない。

> 例（説明用。特定領域の規則ではない）: ある variant が「防腐剤を含有しない」という Fact を満たしても、
> 既存 ADDON が「特殊な構造の容器が使用されています」と述べ、資料がそれを裏付けないなら、その文は
> `unsupported` である。「防腐剤を含有しない」という Fact が成立しても、その ADDON への routing は
> Fact だけからは確定しない。

---

## 5. Deterministic vs Design Judgment

| Fact から決まる（deterministic） | design judgment（Fact だけでは決まらない） |
|---|---|
| Fact そのものの記録（source / version / date / 性質） | Level 2 の routing（variant の実在に加え、§4 の結果が要る） |
| 判定基準（`docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md`）の適用に必要な入力が、検証済みの Fact として揃っているかの確認 | 本文が適合しない場合の扱い（routing しない／専用 ADDON／Owner 判断） |
| — | gate の粒度、新しい tag の要否・命名、状態ごとの扱い（例: 調製後の状態を基準にするか） |

Fact が揃っても routing は自動では確定しない。AI は routing を**提案**として示し、確定は Human / Owner が行う。

---

## 6. Human / Owner Gates and STOP / PENDING

**Owner の判断を要する場面**: Fact で決まらない判断（§5 の右列）／OWNER INTENT の採用／
Fact と Owner の運用意図が食い違う場合。

**PENDING にして routing を確定しない条件**
- 必須の Fact を authoritative な source で確認できない（二次資料しかない場合を含む）
- §4 の review に `unsupported` または `contradicted` がある
- §2 の Freshness の再確認が必要で、まだ行えていない

**STOP する条件**
- Fact を推測・類推・代表値で補う必要が生じた
- OWNER INTENT を FACT として記述する必要が生じた

---

## 7. Handoff / Traceability

- Product Fact と、その性質、source、version、verification date、§4 の review 結果、routing の根拠、
  残った PENDING は、Bridge Header のコメントに記録する。
- PN2 は、Bridge Header に記録された値を逐語で転記する（`prompts/vNext/PN2-Drug-Header.md`）。
  Header の設計入力は PN2 の責務ではない。
- 本書の遵守は Human review で確認する。validator・test による機械検査は定めない。
- 既存の bridge に対する retrofit は求めない。
- 本書と Repository の現状（bridge・canonical・living SSOT）が食い違う場合は、Repository の現状が優先する。
