# gatsby-plugin-drive

Downloads and caches a Google Drive folder that you can then query with `gatsby-source-filesystem`.

> This is still a work in progress.

## Installation

```bash
yarn add @fs/gatsby-plugin-drive
```

## Usage

In order to use this plugin, you'll need to generate a Google Service Account and share your drive folder with its email. [Here's a guide](https://www.twilio.com/blog/2017/03/google-spreadsheets-and-javascriptnode-js.html).

```js
// In your gatsby-config.js

plugins: [
  {
    resolve: `@fs/gatsby-plugin-drive`,
    options: {
      folderId: `GOOGLE_DRIVE_FOLDER_ID`,
      keyFile: path.resolve(__dirname, 'YOUR_SERVICE_ACCOUNT_KEYFILE.json'),
      destination: path.join(__dirname, `src/content`),
    },
  },
],
```

Your drive folder will download all files everytime it builds, except when a file already exists or is cached. To download all files again, set up an npm clean script like:

```json
"clean": "rimraf src/content",
```

## Author

* Fabian Schultz ([@fschultz\_](https://twitter.com/fschultz_)) - [Stink Studios](https://stinkstudios.com)