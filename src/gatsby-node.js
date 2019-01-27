const googleapi = require(`./googleapis`);
const path = require(`path`);
const mkdirp = require(`mkdirp`);
const fs = require(`fs`);

const log = str => console.log(`\n\n🚗 `, str);
const FOLDER = `application/vnd.google-apps.folder`;
const GOOGLE_DOC = 'application/vnd.google-apps.document';

let shouldExportGDocs;
let exportMime;

exports.onPreBootstrap = (
  { graphql, actions },
  { folderId, keyFile, destination, exportGDocs, exportMimeType }
) => {
  return new Promise(async resolve => {
    log(`Started downloading content`);

    // Get token and fetch root folder.
    const token = await googleapi.getToken(keyFile);
    const cmsFiles = await googleapi.getFolder(folderId, token);
    shouldExportGDocs = exportGDocs;
    exportMime = exportMimeType;

    // Create content directory if it doesn't exist.
    mkdirp(destination);

    // Start downloading recursively through all folders.
    console.time(`Downloading content`);
    recursiveFolders(cmsFiles, undefined, token, destination).then(() => {
      console.timeEnd(`Downloading content`);
      resolve();
    });
  });
};

function recursiveFolders(array, parent = '', token, destination) {
  return new Promise(async (resolve, reject) => {
    let promises = [];
    let filesToDownload = shouldExportGDocs
      ? array
      : array.filter(file => file.mimeType !== GOOGLE_DOC)

    for (let file of filesToDownload) {
      // Check if it`s a folder or a file
      if (file.mimeType === FOLDER) {
        // If it`s a folder, create it in filesystem
        log(`Creating folder ${parent}/${file.name}`);
        mkdirp(path.join(destination, parent, file.name));

        // Then, get the files inside and run the function again.
        const files = await googleapi.getFolder(file.id, token);
        promises.push(
          recursiveFolders(files, `${parent}/${file.name}`, token, destination)
        );
      } else {
        promises.push(
          new Promise(async (resolve, reject) => {
            // If it`s a file, download it and convert to buffer.
            const dest = path.join(destination, parent, getFilenameByMime(file));

            if (fs.existsSync(dest)) {
              resolve(getFilenameByMime(file));
              return log(`Using cached ${getFilenameByMime(file)}`);
            }

            const buffer = file.mimeType === GOOGLE_DOC
              ? await googleapi.getGDoc(file.id, token, exportMime)
              : await googleapi.getFile(file.id, token);

            // Finally, write buffer to file.
            fs.writeFile(dest, buffer, err => {
              if (err) return log(err);

              log(`Saved file ${getFilenameByMime(file)}`);
              resolve(getFilenameByMime(file));
            });
          })
        );
      }
    }

    Promise.all(promises).then(() => resolve());
  });
}

const fileExtensionsByMime = new Map([
  ['text/html', '.html'],
  ['application/zip', '.zip'],
  ['text/plain', '.txt'],
  ['application/rtf', '.rtf'],
  ['application/vnd.oasis.opendocument.text', '.odt'],
  ['application/pdf', '.pdf'],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx'],
  ['application/epub+zip', '.epub']
]);

const getFilenameByMime = file => {
  if (file.mimeType === GOOGLE_DOC) {
    return `${file.name}${fileExtensionsByMime.get(exportMime)}`
  } else {
    return file.name;
  }
}
