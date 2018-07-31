const googleapi = require(`./googleapis`);
const path = require(`path`);
const rimraf = require(`rimraf`);
const mkdirp = require(`mkdirp`);
const fs = require(`fs`);

const log = str => console.log(`\n\n🚗 `, str);
const FOLDER = `application/vnd.google-apps.folder`;

exports.onPreBootstrap = (
  { graphql, actions },
  { folderId, keyFile, destination }
) => {
  return new Promise(async resolve => {
    log(`Started downloading content`);

    // Get token and fetch root folder.
    const token = await googleapi.getToken(keyFile);
    const cmsFiles = await googleapi.getFolder(folderId, token);

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

    for (let file of array) {
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
            const dest = path.join(destination, parent, file.name);

            if (fs.existsSync(dest)) {
              resolve(file.name);
              return log(`Using cached ${file.name}`);
            }

            const buffer = await googleapi.getFile(file.id, token);

            // Finally, write buffer to file.
            fs.writeFile(dest, buffer, err => {
              if (err) return log(err);

              log(`Saved file ${file.name}`);
              resolve(file.name);
            });
          })
        );
      }
    }

    Promise.all(promises).then(() => resolve());
  });
}
