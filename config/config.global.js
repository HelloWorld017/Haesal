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

//If you turns on this option, users can get files which are blocked by accessibility.
//But, remember, you should not upload files which must not be downloaded to public.
//So, I recommend setting this option to false and not putting security-related files into public.
//Also, this will check folder.hsfin for every files before being downloaded by users.
config.block.block_unreachable_files = false;

//Starting with
config.block.whitelist = [
	"**/resources"
];

config.github = {};
config.github.client_id = "xxxx";
config.github.client_secret = "yyyy";

module.exports = config;