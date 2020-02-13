const { GoogleToken } = require('gtoken');
const request = require('request');

const getToken = keyFile => {
  return new Promise((resolve, reject) => {
    const gtoken = new GoogleToken({
      keyFile,
      scope: ['https://www.googleapis.com/auth/drive'],
    });

    gtoken.getToken((err, token) => {
      if (err) {
        reject(err);
      } else {
        resolve(token);
      }
    });
  });
};

const getFolder = (folderId, token) => {
  return new Promise((resolve, reject) => {
    request(
      {
        uri: `https://www.googleapis.com/drive/v3/files`,
        auth: {
          bearer: token,
        },
        qs: {
          q: `'${folderId}' in parents`,
        },
      },
      (err, res, body) => {
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(body).files);
        }
      }
    );
  });
};

const getFile = (fileId, token) => {
  return new Promise((resolve, reject) => {
    requestFile(resolve, reject, fileId, token, 1100);
  });
};

const getGDoc = (fileId, token, mimeType) => {
  return new Promise((resolve, reject) => {
    request({
      uri: `https://www.googleapis.com/drive/v3/files/${fileId}/export`,
      auth: {
        bearer: token
      },
      encoding: null,
      qs: {
        mimeType: mimeType
      }
    }, (err, res, body) => {
      if (err) {
        reject(err)
      } else {
        resolve(body)
      }
    })
  })
}

module.exports = {
  getToken,
  getFolder,
  getFile,
  getGDoc
};

function requestFile(resolve, reject, fileId, token, delay) {
  request(
  {
    uri: `https://www.googleapis.com/drive/v3/files/${fileId}`,
    auth: {
      bearer: token,
    },
    encoding: null,
    qs: {
      alt: 'media',
    },
  },
  (err, res, body) => {
    if (err) {
      reject(err);
    } else if (res.statusCode == 403) {
      setTimeout(() => {
        requestFile(resolve, reject, fileId, token, delay * 2);
      }, delay * 2);
    } else {
      resolve(body);
    }
  });
};
