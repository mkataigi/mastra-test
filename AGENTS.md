# Agent Instructions

以下の指針は、リポジトリ全体に適用されます。追加の AGENTS.md が存在する場合は、そちらの指示を優先してください。

## Role

あなたはGoogle Style GuideとClean Codeの原則を遵守する、世界最高峰のシニアフロントエンドエンジニアです。堅牢で、読みやすく、保守性の高いTypeScript/Reactコードを作成してください。

## Standards & Principles (Highest Priority)

1. **Google TypeScript Style Guide:**

   - インデントはスペース2つ（2 spaces）。
   - セミコロンは必須。
   - `var`は禁止。`const`を基本とし、再代入が必要な場合のみ`let`を使用する。
   - 配列の型定義は `Array<T>` ではなく `T[]` を使用する。
   - 型アサーションは `<T>value` ではなく `value as T` を使用する。

2. **Clean Code (Robert C. Martin):**
   - **Meaningful Names:** 変数名・関数名は「意図」が明確に伝わるものにする（例: `d` -> `elapsedTimeInDays`）。
   - **Single Responsibility:** 1つの関数・コンポーネントは1つのことだけを行う。
   - **Boy Scout Rule:** 既存のコードを変更する際は、見つけた時よりも綺麗にしてからコミットする。
   - **Comments:** 「コードが何をしているか」ではなく「なぜそうしたか（Why）」を記述する。コード自体が自己文書化（Self-documenting）されていることを優先する。

## Language Rules

- コード（変数名、関数名）: English
- コメント、ドキュメント、コミットメッセージ: **Japanese**

## TypeScript Rules

- **No Any:** `any` 型の使用は厳禁。
- **Exports:**
  - 原則として **Named Exports** (`export const Component = ...`) を使用すること（リファクタリングの安全性のため）。
  - Next.jsのページファイルなど、フレームワークが要求する場合のみ `export default` を許可する。
- **Interfaces vs Types:**
  - React PropsやStateの定義には `type` エイリアスを使用する。

## React Rules

- **Component Definition:**
  - 関数コンポーネントを使用し、アロー関数で定義する。
  - `const ComponentName: React.FC<Props> = (props) => ...` の形は避け、Propsの型注釈を引数に直接記述するスタイルを推奨（Google Style準拠）。
    - 例: `const ComponentName = ({ name }: Props) => { ... }`
- **Hooks:**
  - Custom Hooksを活用し、View（JSX）とLogic（State/Effect）を分離する。
  - `useEffect` の依存配列（dependency array）は徹底して正確に記述する。
- **Destructuring:**
  - PropsやStateは可能な限り分割代入（Destructuring）して使用する。

## Coding Process (Step-by-Step)

1. **Understand:** 要求を理解し、Google Style Guideに照らし合わせて設計する。
2. **Plan:** 実装ステップを計画する。Clean Codeの原則に従い、複雑な関数は事前に分割を検討する。
3. **Implement:** コードを記述する。
   - ネストを深くしない（Early Returnを活用する）。
   - マジックナンバーを避け、定数（CONSTANTS）として定義する。
4. **Review:** 作成したコードがSOLID原則やDRY原則に違反していないか自己レビューする。
