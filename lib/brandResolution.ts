/**
 * brandResolution.ts
 *
 * 状態: Current Standard（docs/DEVELOPMENT_STANDARD.md §10.1 準拠）
 *
 * **domain contract は承認済みであり、runtime integration は U-2 以降で行う。**
 * 本ファイルは Q-S2（`docs/OPEN_DESIGN_QUESTIONS.md`）の実装 Unit U-1 の成果物であり、
 * U-1 時点では意図的に runtime consumer を接続していない。接続は次の順序で行う:
 *
 *   U-2 : lib/search.ts が DrugSuggestionItem へ BrandResolution を付与する
 *   U-3 : lib/drugSubject.ts の resolveDrugName() を「resolution state → SOAP 主語」へ刷新する
 *   U-4 : app/components/DashboardClient.tsx の独自 fallback を本契約へ統一する
 *   U-5 : denotation='module'（subject 未確定）での SOAP 生成・brand 依存 ADDON 解決を禁止する
 *
 * これは Future Expansion（意図的な未接続）でも Experimental（試行）でもない。
 * 承認済みの契約であり、上記 Unit で順次接続される予定のものである。
 *
 * ── 解決する問題 ──────────────────────────────────────────────
 *
 * 従来、検索結果は「brand が確定したか」を `matchedBrandName?: string` の undefined
 * だけで表現していた。この表現では次の 3 つが同一状態へ潰れる。
 *
 *   1. 弱い corpus 一致しか得られなかった候補
 *   2. module 単位 alias には強く一致したが brand を一意に決められない候補
 *   3. 薬効クラス名等、そもそも単一 brand を意味しないクエリの候補
 *
 * 潰れた結果、消費側は「未確定」を検出できず、`drug.brandNames[0]`（JSON の配列宣言順
 * という意味論を持たない値）へ静かに確定していた。この確定は SOAP 主語だけでなく、
 * brandCatalog[].handlingTags を介した ADDON フィルタリングにも波及する。
 *
 * 本契約は「module は確定したが brand は確定していない」を表現可能にし、
 * 未確定からの fallback を型レベルで表現不能にすることを目的とする。
 *
 * ── 関連 ──────────────────────────────────────────────────────
 *
 * - 論点・選択肢・Owner Decision : `docs/OPEN_DESIGN_QUESTIONS.md` Q-S2
 * - alias 複製境界・own-name 優先 : `docs/DESIGN_PRINCIPLES.md` DP-18
 * - 一般名検索到達性             : `docs/DESIGN_PRINCIPLES.md` DP-09
 * - 不確定性を推測で埋めない原則 : `docs/DESIGN_PRINCIPLES.md` DP-15
 * - genericName / genericKey の役割分離 : `prompts/RULES.md` §21
 */

/**
 * クエリが module へ一致した際の「一致の強さ」。
 *
 * `BrandResolution`（何が確定したか）とは直交する独立した軸であり、union の内側へ
 * 混ぜない。両者を混ぜると状態が組み合わせで増え、意味論が不安定になるためである。
 *
 * - `strong` : 構造化フィールドへの一致（exactAliases / primaryDisplayName /
 *              nameAliases / brandCatalog[].aliases 等）
 * - `weak`   : corpus 部分一致のみで候補に残ったもの
 *
 * 注意: `weak` であることは「brand が確定しない」ことを意味しない。逆に `strong` で
 * あっても brand が確定しないことがある（薬効クラス名での検索など）。
 */
export type MatchStrength = 'strong' | 'weak'

/**
 * 検索候補が「何を指しているか」を表す domain state。
 *
 * 判別子 `denotation` により、消費側は未確定ケースの処理を省略できない。
 * `denotation: 'module'` は `brandKey` / `subject` がいずれも `null` であることが
 * 型で固定されており、そこから代替値を導出する経路は存在しない。
 *
 * ── 各状態の契約 ──────────────────────────────────────────────
 *
 * | denotation | brand 確定 | SOAP 主語 | brandCatalog 参照キー |
 * |---|---|---|---|
 * | `brand`    | 確定       | brand 名  | `brandKey`（authoritative） |
 * | `generic`  | **未確定** | 一般名    | **単一キーを持たない**      |
 * | `module`   | 未確定     | **なし**  | なし                        |
 */
export type BrandResolution =
  | {
      /** 単一 brand が確定している。 */
      denotation: 'brand'
      /**
       * `drug.brandCatalog` の参照キー。この候補に対して authoritative であり、
       * handlingTags / brandToTags / ADDON フィルタの取得に使用してよい。
       * 値は必ず `drug.brandNames` の要素と一致する。
       */
      brandKey: string
      /** SOAP `{{drug_subject}}` へ渡す確定値（brand 名）。 */
      subject: string
    }
  | {
      /**
       * 一般名（成分）としては確定しているが、単一 brand は確定していない。
       *
       * **本 member は authoritative な単一 brandKey を持たない。** group 内の
       * 代表 brand を型契約へ持たせると、`brandNames[0]` fallback と同型の
       * 「意味論を持たない代表 brand 選択」を再導入することになるためである。
       * 実際に `derm_heparinoid_moisturizer_ointment` では、同一 generic group 内の
       * brand 間で handlingTags が異なる実例が確認されている（Q-S2 / U-8 で扱う）。
       */
      denotation: 'generic'
      /**
       * 一般名グルーピングキー。
       *
       * **canonical JSON の `brandCatalog[].genericKey` そのものではない。**
       * `genericKey ?? displayGenericName ?? genericName` の優先順で解決した後の値
       * であり（`prompts/RULES.md` §21）、`lib/search.ts` の
       * `SearchEntry.brandCatalogGenericKeyMap` が保持する値と同一の意味論を持つ。
       * 実測では全 brand について解決可能である。
       */
      genericKey: string
      /**
       * この一般名グループに属する brand の一覧。
       *
       * group の構成を記録するためのものであり、**この配列から特定の 1 件を選んで
       * brand 固有の値（handlingTags 等）を取得してはならない。** 取得方法は U-1 では
       * 定めない（U-5 / U-8 の対象）。
       */
      brandKeys: readonly string[]
      /**
       * SOAP `{{drug_subject}}` へ渡す確定値（一般名）。
       *
       * 同一 group 内で表示一般名が一意に定まることを実測で確認済みであり、
       * この値は brand の配列順に依存しない。
       */
      subject: string
    }
  | {
      /**
       * module は確定したが、brand も一般名も確定していない。
       *
       * この状態から SOAP 主語を生成してはならず、brand 依存の解決
       * （handlingTags / brandToTags / ADDON フィルタ）も行ってはならない。
       * 検索候補として選択可能であることと、SOAP 生成可能な確定状態であることは
       * 別である（Q-S2 Owner Decision）。
       */
      denotation: 'module'
      brandKey: null
      subject: null
    }
