# Room photo asset sources

These files are stored under frontend/public/images/rooms. The website still reads room assignments from room_type_images; this asset-only change does not insert or update database rows.

| Local URL                         | Source listing label | Original photo                                                                                                                                   |
| --------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| /images/rooms/standard-double.jpg | Standard Double Room | https://q-xx.bstatic.com/xdata/images/hotel/max500/556806699.jpg?a=2195102&k=8dbd0518488e3a5100eed026fae08c2996c9ce394f15771ec147d7287f4bf25f&o= |
| /images/rooms/deluxe-double.jpg   | Deluxe Double Room   | https://q-xx.bstatic.com/xdata/images/hotel/max500/624455132.jpg?a=2195102&k=bbb56be770d7d8c84941a4ec55c0fbcb77be2fcde8edf6b683e066dbb9841e85&o= |
| /images/rooms/family-suite.jpg    | Deluxe Family Room   | https://q-xx.bstatic.com/xdata/images/hotel/max500/556806761.jpg?a=2195102&k=f3c5a76277a6b64dafe915eb8600752a662770028e7a05815d1c10f5885a221d&o= |

Source page: https://en.planetofhotels.com/sri-lanka/kiribathgoda/forever-city-hotel. Retrieved 10 November 2026. The family-suite filename is the proposed asset path only: the source labels it Deluxe Family Room, and the final room-category assignment remains to be confirmed. Source attribution does not establish reuse permission.

The existing Dockerfile copies frontend/public into the deployed frontend. These local /images/ paths do not require ROOM_IMAGE_HOSTS. Review and merge the asset PR, wait for automatic HW deployment, then assign approved paths to the correct room types in the database as a separate step.
