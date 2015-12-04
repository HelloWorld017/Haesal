var config = {};

config.folder_name = "folder.hsdin";
config.file_ext = ".hsfin";
config.exclusion_name = "./exclusion.hsein";

//resource folder should contain resources folder.
config.resources_directory = "./public";

config.default_config = {
	accessibility: 2,
	index: false,
	type: "local"
};

config.read_config = {
	encoding: "UTF-8"
};

//If your file separator (/ or \) in wildcards is different with it of your system, it will be changed automatically.
config.wildcard_auto_sep = true;

config.lang = "en";

config.block = {};

//If you turns on this option, users can get files which are blocked by accessibility.
//But, remember, you should not upload files which must not be downloaded to public.
//So, I recommend setting this option to false and not putting security-related files into public.
//Also, this will check folder.hsfin for every files before being downloaded by users.
//If you want to turn on this option, please set default accessibility to 0. This will not block folders.
config.block.block_unreachable_files = false;

config.block.whitelist = [
	"/resources/**"
];

config.block.ignore = true;

config.github = {};
config.github.client_id = "xxxx";
config.github.client_secret = "yyyy";
config.github.add_link = true;

config.errors = {};

config.errors = {
	"404-masthead": "Page not found",
	"404-description": "What you are finding is not here.",
	"403-masthead": "Forbidden",
	"403-description": "Oops! You are trying to get our secrets!",
	"500-masthead": "Internal Server Error",
	"500-description": "Whoa! There was a bug."
};

module.exports = config;