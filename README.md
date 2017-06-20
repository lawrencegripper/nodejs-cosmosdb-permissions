# nodejs-cosmosdb-permissions
Quick sample to demonstrate using CosmosDB permissions in nodejs. Creating a document and limited access token.

#Simple Create to return document and access tokens

```GET /cosmos/create HTTP/1.1
Host: localhost:8080
Cache-Control: no-cache
Postman-Token: 2b35dd7d-fd16-c8c8-d1c6-c152754590b7```

Returns...
```{
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
}```

#Demonstrate using these tokens to access a document

Using the token, resourceId and docLink from the above request we can now access the document 
using the token rather than the masterkey

```GET /cosmos/read HTTP/1.1
Host: localhost:8080
token: type=resource&ver=1&sig=VQo0nUQdoP/0TPbZUgBm5w==;AFdhoofrRKAgRbs/t3itVF0oybDDo+idcpGJzP/FhIsrfYPT9qW+6njJoQOWjUmGXgkJ9prmW9Jv0sfgqTMpfujdxkowbKd5TCeW9Ir9Bet8CD3fEQ7Jd+Oii7ZelFHP3a0SLC2IA2o1C3QnRd4vSzdDrU8r/mny+SHSLiOOOy4/S5vswQ0iKM79mtEH+SUODhKroEWjVR3RYxzd6bKjDsAKL6KBaiZOXy5RYE8W6SB6ncJDjOt9iXPKl4mL7EojunrcGQxArQI3HCFNxGUDXLKQ2E87WcqDPVt0Ra5HWFImxDRK6Te4ViDlixbFWA7W;
resourceId: InAcAM9IDQA1AAAAAAAAAA==
docLink: dbs/InAcAA==/colls/InAcAM9IDQA=/docs/InAcAM9IDQA1AAAAAAAAAA==/
Cache-Control: no-cache
Postman-Token: 51c2245c-b42b-9cbb-7341-a2ce3abcb2ff```
