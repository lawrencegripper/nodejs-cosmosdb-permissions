var utils = {
    getResourceId: function (resourceUrl) {
        let parts = resourceUrl.split('/');
        let resourceId = parts[parts.length - 1].toLocaleLowerCase();

        return resourceId;
    },

    checkAndCreateDatabase: function (client, databaseUrl) {
        return new Promise((resolve, reject) => {
            client.readDatabase(databaseUrl, (err, result) => {
                if (err) {
                    if (err.code == '404') {
                        client.createDatabase(dbconfig, (err, created) => {
                            if (err) reject(err)
                            else resolve(created);
                        });
                    } else {
                        reject(err);
                    }
                } else {
                    resolve(result);
                }
            });
        });
    },

    checkAndCreateCollection: function (client, collectionName, dbLink) {
        let collectionId = collectionName;

        return new Promise((resolve, reject) => {
            console.log(dbLink)
            var querySpec = {
                query: 'SELECT * FROM root r WHERE r.id=@id',
                parameters: [{
                    name: '@id',
                    value: collectionId
                }]
            };
            client.queryCollections(dbLink, querySpec).toArray(function (err, results) {
                if (err) {
                    callback(err);

                } else {
                    if (results.length === 0) {
                        var collectionSpec = {
                            id: collectionId
                        };

                        client.createCollection(dbLink, collectionSpec, function (err, created) {
                            resolve(created);
                        });

                    } else {
                        resolve(results[0]);
                    }
                }
            });
        });
    },

    checkAndCreateUser: function (client, dbLink, userId) {
        return new Promise((resolve, reject) => {
            var querySpec = {
                query: 'SELECT * FROM root r WHERE r.id=@id',
                parameters: [
                    {
                        name: '@id',
                        value: userId
                    }
                ]
            };

            client.queryUsers(dbLink, querySpec).toArray(function (err, results) {
                if (err) {
                    handleError(err);
                } else if (results.length === 0) {

                    client.createUser(dbLink, { id: userId }, (error, results) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(results);
                        }
                    });

                    //collection found, return it
                } else {
                    resolve(results[0]);
                }
            });


        });
    }
};

module.exports = utils; 