# gatsby-plugin-drive

Downloads and caches a Google Drive folder that you can then query with `gatsby-source-filesystem`.
Optionally exports Google Docs to a usable format.

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
    resolve: '@fs/gatsby-plugin-drive',
    options: {
      folderId: 'GOOGLE_DRIVE_FOLDER_ID',
      keyFile: path.resolve(__dirname, 'YOUR_SERVICE_ACCOUNT_KEYFILE.json'),
      destination: path.join(__dirname, 'src/content'),
      exportGDocs: true,
      exportMimeType: 'text/html',
      exportMiddleware: someFunction
    }
  }
]
```
If the `exportGDocs` option is enabled, all Google Docs in the folder will be exported with the MIME type set in the `exportMimeType` option. You can see a list of available Google Docs export MIME types [here](https://developers.google.com/drive/api/v3/manage-downloads).
If the `exportGDocs` option is disabled, all Google Docs in the folder will be ignored.

The `exportMiddleware` option is optional. If set, the plugin will run each Google Doc through the function, before it writes it to disk.
A usecase for this, could be cleaning up, or manipulating, the HTML that the Google Drive API returns.  
The expected function signature is `Buffer -> Buffer`.


Your drive folder will download all files everytime it builds, except when a file already exists or is cached. To download all files again, set up an npm clean script like:

```json
"clean": "rimraf src/content",
```

## Author

* Fabian Schultz ([@fschultz\_](https://twitter.com/fschultz_)) - [Stink Studios](https://stinkstudios.com)
* Elias Jørgensen ([@\_eliasjorgensen](https://twitter.com/_eliasjorgensen))