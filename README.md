# SaaS - Samoyeds as a service
The Samoyed API. request samoyed images, favorite them or upload your own.

## Endpoints

__GET /samoyed?count=[1-10]__\
	Default of count is 1\
__POST /samoyed (Requires API Key)__\
	User must include an image, which will be uploaded\
__DELETE /samoyed (Requires API Key)__\
	User requests a deletion of image they uploaded.

__GET /users/:UID/__\
	Returns data on user, including amount of requested pictures and uploaded pictures.\
__GET /users/:UID/favorites__\
	Returns links to favorited images of a specified user\
__GET /users/:UID/uploads__\
	Returns links to favorited images of a specified user\
__PUT users/:UID/:PID__   (Requires API Key)\
	Adds image to users favorites

__GET /report__\
	Admin command to fetch oldest stored report\
__PUT /report/:PID__\
	Sends a report of a possible non-samoyed image.
