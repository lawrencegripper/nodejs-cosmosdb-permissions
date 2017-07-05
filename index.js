var restify = require('restify');
var documentClient = require("documentdb").DocumentClient;
var uuid = require('uuid');
var utils = require('./utils.js');

//Create CosmosDB client
let client = new documentClient(process.env.COSMOS_ENDPOINT, { "masterKey": process.env.COSMOS_KEY });

//Setup the collection and db
let dbname = 'testdb'
let dbconfig = {
  "id": dbname
};
let databaseUrl = `dbs/${dbname}`;

//Cosmos objects, available once initialized. 
let collectionObj = null;
let dbObj = null;
let dbReadonlyUserObj = null;
let dbReadWriteUserObj = null;

//Initialize the server, checking and creating (if needed), our database, collections and users. 
utils.checkAndCreateDatabase(client, databaseUrl)
  .then((db) => {
    dbObj = db;
    console.log(`Completed DB Create`);
    checkAndCreateCollection(client, 'testCollection2', db._self)
      .then((coll) => {
        //We're all setup so lets start restify
        collectionObj = coll;

        //Create readonly users
        utils.checkAndCreateUser(client, db._self, 'readonlyUser')
          .then((user) => {

            dbReadonlyUserObj = user;

            utils.checkAndCreateUser(client, db._self, 'readWriteUser')
              .then((user) => {

                dbReadWriteUserObj = user;
                server.listen(8080, function () {
                  console.log('%s listening at %s', server.name, server.url);
                });
              })
              .catch((error) => {
                console.log(`User creation completed with error ${JSON.stringify(error)}`)
              });
          })
          .catch((error) => {
            console.log(`User creation completed with error ${JSON.stringify(error)}`)
          });


      })
      .catch((error) => {
        console.log(`Collection completed with error ${JSON.stringify(error)}`)
      });

  })
  .catch((error) => {
    console.log(`Database completed with error ${JSON.stringify(error)}`)
  });


var server = restify.createServer({
  name: 'myapp',
  version: '1.0.0'
});
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

server.get('/cosmos/read', function (req, res, next) {
  // Takes in headers of 'resourceId', 'doclink' and 'token'
  // Then creates a limitedClient using the supplied token to read the data
  // from the document. 
  // The client cannot access other resources. 

  let docLink = req.headers['doclink'];
  let resourceId = req.headers['resourceid'].toLowerCase();
  let limitedClient = new documentClient(process.env.COSMOS_ENDPOINT, {
    resourceTokens: { [resourceId]: req.headers['token'] }
  })

  limitedClient.readDocument(docLink, (error, readDoc) => {
    if (error) {
      res.code = 500;
      res.send(error);
      return next();
    }
    else {
      limitedClient.readAttachments(docLink).toArray((errror, readAttachments) => {
        var mediaLinks = readAttachments.map((a) => {
          return a.media;
        });

        res.send({
          document: readDoc,
          attachementMediaLinks: mediaLinks
        })
        return next();
      });
    }
  });
});

server.get('/cosmos/create', function (req, res, next) {
  // Creates a new document using the master key 
  // Creates a token so other system can use this to access only this document
  // Returns the 'readToken', 'readWriteToken', 'resourceId' and 'docLink'
  // these can be passed to '/cosmos/create' to access the document using the token.  

  let document = {
    'id': uuid.v4(),
    'content': {
      'some': 'content'
    }
  }

  client.createDocument(collectionObj._self, document, (err, createdDoc) => {
    if (err) {
      res.code = 500;
      res.send(error);
      return next();
    }
    else {
      let readPermissions = {
        id: uuid.v4(),
        permissionMode: 'read',
        resource: createdDoc._self
      };

      let writePermissions = {
        id: uuid.v4(),
        permissionMode: 'all',
        resource: createdDoc._self
      };

      //Request readonly permissions
      client.createPermission(dbReadonlyUserObj._self, readPermissions, (error, createdReadonlyPermission) => {
        if (error) {
          res.code = 500;
          res.send(error);
          return next();
        }
        //Request readwrite permissions
        client.createPermission(dbReadWriteUserObj._self, writePermissions, (error, createdWritePermission) => {
          if (error) {
            res.code = 500;
            res.send(error);
            return next();
          }
          res.send({
            readToken: {
              id: createdReadonlyPermission._self,
              token: createdReadonlyPermission._token
            },
            readWriteToken: {
              id: createdWritePermission._self,
              token: createdWritePermission._token
            },
            docLink: createdDoc._self,
            resourceId: createdDoc._rid,
            documentCreated: document
          });
          return next();
        });
      });
    }
  });
});

server.put('/cosmos/attachment/', function (req, res, next) {
  // Takes in headers of 'resourceId', 'doclink' and 'token'
  // Then creates a limitedClient using the supplied token to read the data
  // from the document. 
  // The client cannot access other resources. 
  if (!req.isUpload()) {
    res.send('Endpoint requires a file upload to attach to the document');
    return next();
  }

  let resourceId = req.headers['resourceid'].toLowerCase();
  let limitedClient = new documentClient(process.env.COSMOS_ENDPOINT, {
    resourceTokens: { [resourceId]: req.headers['token'] }
  })

  limitedClient.createAttachmentAndUploadMedia(req.headers['doclink'], req.body, (error, result) => {
    if (error) {
      res.code = 500;
      res.send(error);
      return next();
    }
    else {
      res.send(result);
      return next();
    }
  });
});

server.get('cosmos/generatepermissions', function (req, res, next) {
  let resourceLink = req.headers['resourcelink'];
  let resourceId = req.headers['resourceid'].toLowerCase();

  let readPermissions = {
    id: uuid.v4(),
    permissionMode: 'read',
    resource: resourceLink
  };

  client.createPermission(dbReadonlyUserObj._self, readPermissions, (error, result) => {
    if (error) {
      res.code = 500;
      res.send(error);
      return next();
    }
    else {
      res.send({
        ReadToken: {
          id: result._self,
          token: result._token
        },
        resourceLink: resourceLink,
        resourceId: resourceId
      });
      return next();
    }
  });
});

server.get('/cosmos/attachment/', function (req, res, next) {

  let resourcelink = req.headers['resourcelink'];
  let resourceId = req.headers['resourceid'].toLowerCase();
  let resourceToken = req.headers['token'];
  let limitedClient = new documentClient(process.env.COSMOS_ENDPOINT, {
    resourceTokens: { [resourceId]: resourceToken }
  });

  attachmentClient.readMedia(item._self, (error, resource) => {
    console.log(media.length);

  });

  limitedClient.readDocument(docLink, (error, readDoc) => {
    if (error) {
      res.code = 500;
      res.send(error);
      return next();
    }
    else {
      limitedClient.readAttachments(docLink).toArray((errror, readAttachments) => {
        var tokens = readAttachments.map((a) => {
          let parts = a._self.split('/');
          let attachmentResourceId = parts[parts.length - 1].toLocaleLowerCase();
          return {
            [attachmentResourceId]: resourceToken
          }
        });
        let attachmentClient = new documentClient(process.env.COSMOS_ENDPOINT, {
          resourceTokens: tokens
        });

        if (readAttachments && readAttachments.length > 0) {
          readAttachments.forEach((item) => {

          });
        }

        res.send(readDoc);
        return next();

      });
    }
  });
});

//Oustanding Questions:
// - How does/can tokens be revoked? Was unable to get this to work. Once issues tokens seem to last for the lifetime of the resource. 
// - Get a better handle on the User -> Permission relationship. Could other services be
//    granted permisions to a user object and retreive all the tokens from that object,
//    then create a user per service, would this work well?

