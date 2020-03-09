const googleapi = require(`./googleapis`)
const path = require(`path`)
const mkdirp = require(`mkdirp`)
const fs = require(`fs`)
const rimraf = require(`rimraf`)

const FOLDER = `application/vnd.google-apps.folder`
const GOOGLE_DOC = 'application/vnd.google-apps.document'

let shouldExportGDocs
let exportMime
let middleware

exports.onPreBootstrap = (
  {graphql, actions},
  {
    folderId,
    keyFile,
    destination,
    exportGDocs,
    exportMimeType,
    exportMiddleware,
    deleteNotFound,
  },
) => {
  return new Promise(async resolve => {
    console.log(`🚗 `, `Started downloading content`)

    // Get token and fetch root folder.
    const token = await googleapi.getToken(keyFile)
    const cmsFiles = await googleapi.getFolder(folderId, token)
    shouldExportGDocs = exportGDocs
    exportMime = exportMimeType
    middleware = exportMiddleware === undefined ? x => x : exportMiddleware

    // Create content directory if it doesn't exist.
    mkdirp(destination)

    // Start downloading recursively through all folders.
    console.time(`Downloading content`)
    recursiveFolders(
      cmsFiles,
      undefined,
      token,
      destination,
      deleteNotFound,
    ).then(() => {
      console.timeEnd(`Downloading content`)

      resolve()
    })
  })
}

function recursiveFolders(
  array,
  parent = '',
  token,
  destination,
  deleteNotFound,
) {
  return new Promise(async (resolve, reject) => {
    let promises = []
    let filesToDownload = shouldExportGDocs
      ? array
      : array.filter(file => file.mimeType !== GOOGLE_DOC)

    for (let file of filesToDownload) {
      // Check if it`s a folder or a file
      if (file.mimeType === FOLDER) {
        // If it`s a folder, create it in filesystem
        console.log(`Creating folder ${parent}/${file.name}`)
        mkdirp(path.join(destination, parent, file.name))

        // Then, get the files inside and run the function again.
        const files = await googleapi.getFolder(file.id, token)
        promises.push(
          recursiveFolders(
            files,
            `${parent}/${file.name}`,
            token,
            destination,
            deleteNotFound,
          ),
        )
      } else {
        promises.push(
          new Promise(async (resolve, reject) => {
            // If it`s a file, download it and convert to buffer.
            const dest = path.join(destination, parent, getFilenameByMime(file))

            if (fs.existsSync(dest)) {
              resolve(getFilenameByMime(file))
              return console.log(
                `📦 Using cached`,
                `${parent}/${getFilenameByMime(file)}`,
              )
            }

            const buffer =
              file.mimeType === GOOGLE_DOC
                ? await middleware(
                    googleapi.getGDoc(file.id, token, exportMime),
                  )
                : await googleapi.getFile(file.id, token)

            // Finally, write buffer to file.
            fs.writeFile(dest, buffer, err => {
              if (err) return console.log(err)

              console.log(
                `⬇︎ Saved file`,
                `${parent}/${getFilenameByMime(file)}`,
              )
              resolve(getFilenameByMime(file))
            })
          }),
        )
      }
    }

    Promise.all(promises).then(() => {
      if (deleteNotFound) {
        const dest = path.join(destination, parent)
        console.log(`Deleting not found on ${parent || '/'}...`)
        deleteDiff(dest, filesToDownload, resolve)
      } else {
        resolve()
      }
    })
  })
}

const deleteDiff = function(destination, drive, cb) {
  const promises = []

  fs.readdir(destination, (err, files) => {
    if (err) {
      console.log(err)
    }

    files.forEach(file => {
      const fileDir = path.join(destination, file)
      const fileDownloaded = drive.filter(a => a.name === file)
      if (!fileDownloaded.length) {
        promises.push(
          new Promise(resolve => {
            rimraf(path.join(destination, file), () => {
              console.log('❌ ', file)
              resolve()
            })
          }),
        )
      }
    })

    Promise.all(promises).then(cb)
  })
}

const fileExtensionsByMime = new Map([
  ['text/html', '.html'],
  ['application/zip', '.zip'],
  ['text/plain', '.txt'],
  ['application/rtf', '.rtf'],
  ['application/vnd.oasis.opendocument.text', '.odt'],
  ['application/pdf', '.pdf'],
  [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.docx',
  ],
  ['application/epub+zip', '.epub'],
])

const getFilenameByMime = file => {
  if (file.mimeType === GOOGLE_DOC) {
    return `${file.name}${fileExtensionsByMime.get(exportMime)}`
  } else {
    return file.name
  }
}
