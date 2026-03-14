# Automatic References

Automatic References is a RemNote plugin that creates clickable references for matching terms and short phrases inside the current document.

## What it does

- Scans the current RemNote document for matching terms
- Converts matching words or phrases into clickable Rem references
- Keeps all references inside the current document only
- Supports phrases with up to 3 consecutive words

## Example

If a document already contains a Rem named `Public Accountant`, and the phrase `Public Accountant` appears somewhere else in the same document, the plugin can convert that phrase into a clickable reference.

## Usage

Use the command:

`createRef`

This command processes the current document and creates references for matching terms found within the same document.

## Notes

- References are limited to the current document
- Terms shorter than 3 characters are ignored
- The plugin prefers longer phrase matches up to 3 words

## Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build the plugin:

```bash
npm run build
```

## Repository

GitHub repository:

`https://github.com/Louitz/automaticreferenceplugin_remnote`
