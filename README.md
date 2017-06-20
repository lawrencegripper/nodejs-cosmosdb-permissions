# nodejs-cosmosdb-permissions
Quick sample to demonstrate using CosmosDB permissions in nodejs. Creating a document and limited access token.

# Walthrough

Create a document using the master key and get a read and write token which can be passed to other systems, allowing them to access only this document. 

```
GET /cosmos/create HTTP/1.1
Host: localhost:8080
Cache-Control: no-cache
```

Returns...
```
{
    "readToken": "type=resource&ver=1&sig=VQo0nUQdoP/0TPbZUgBm5w==;AFdhoofrRKAgRbs/t3itVF0oybDDo+idcpGJzP/FhIsrfYPT9qW+6njJoQOWjUmGXgkJ9prmW9Jv0sfgqTMpfujdxkowbKd5TCeW9Ir9Bet8CD3fEQ7Jd+Oii7ZelFHP3a0SLC2IA2o1C3QnRd4vSzdDrU8r/mny+SHSLiOOOy4/S5vswQ0iKM79mtEH+SUODhKroEWjVR3RYxzd6bKjDsAKL6KBaiZOXy5RYE8W6SB6ncJDjOt9iXPKl4mL7EojunrcGQxArQI3HCFNxGUDXLKQ2E87WcqDPVt0Ra5HWFImxDRK6Te4ViDlixbFWA7W;",
    "readWriteToken": "type=resource&ver=1&sig=KGCYO2z6oncRUkts9QnG7w==;djrI1SZY6PH4+XvBiF+4hqQEQBtbwR0Yhk6cS4NQBLB/BSTpu+vL/gbwwQU4DHFLF7uFRoXnbRdhhpBKMSKLyEowmTSci5s13iZ86dLmiy0h5XqPNz+PImJi4tD9BBTTgEvQou8d13V5qik2LNCJdolTuTBDrPKfkfEBnXiPlUNUMtgC4MiP5eToJ/X3+i0SedFy6z0Sa9O5G54W4UqIhrE2+NHrWdNnTmaHxzNy5NDG6XOblhXOMbaqPaWRNCyYj1LwqTHDcWWSx4HSBInsPCdx81GiOt1bM2221hVBIsDHQOwoBEuiEyqLORCvzyxG;",
    "docLink": "dbs/InAcAA==/colls/InAcAM9IDQA=/docs/InAcAM9IDQA1AAAAAAAAAA==/",
    "resourceId": "InAcAM9IDQA1AAAAAAAAAA==",
    "documentCreated": {
        "id": "aa368276-4e09-4c1e-83c9-3aa415ad0d08",
        "content": {
            "some": "content"
        }
    }
}
```

#Demonstrate using these tokens to access a document

Using the token, resourceId and docLink from the above request we can now access the document.

Note the limited client takes in only the token and doesn't require the master key for the cosmos instance. It is limited to the permissions of the token. 

```
GET /cosmos/read HTTP/1.1
Host: localhost:8080
token: type=resource&ver=1&sig=VQo0nUQdoP/0TPbZUgBm5w==;AFdhoofrRKAgRbs/t3itVF0oybDDo+idcpGJzP/FhIsrfYPT9qW+6njJoQOWjUmGXgkJ9prmW9Jv0sfgqTMpfujdxkowbKd5TCeW9Ir9Bet8CD3fEQ7Jd+Oii7ZelFHP3a0SLC2IA2o1C3QnRd4vSzdDrU8r/mny+SHSLiOOOy4/S5vswQ0iKM79mtEH+SUODhKroEWjVR3RYxzd6bKjDsAKL6KBaiZOXy5RYE8W6SB6ncJDjOt9iXPKl4mL7EojunrcGQxArQI3HCFNxGUDXLKQ2E87WcqDPVt0Ra5HWFImxDRK6Te4ViDlixbFWA7W;
resourceId: InAcAM9IDQA1AAAAAAAAAA==
docLink: dbs/InAcAA==/colls/InAcAM9IDQA=/docs/InAcAM9IDQA1AAAAAAAAAA==/
```
