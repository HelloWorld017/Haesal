var config = {};

config.folder_name = "folder.hsdin";
config.file_ext = ".hsfin";
config.exclusion_name = "./exclusion.hsein";

config.default_config = {
	accessibility: 2,
	index: false,
	type: "local"
};

config.read_config = {
	encoding: "UTF-8"
};

config.github = {};
config.github.client_id = "xxxx";
config.github.client_secret = "yyyy";

module.exports = config;