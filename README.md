# Haesal
![License](https://img.shields.io/badge/license-GPLv3-orange.svg?style=flat-square)
![Build Status](https://img.shields.io/travis/HelloWorld017/Haesal.svg?style=flat-square)
![Node](https://img.shields.io/badge/node-v5.1.0-blue.svg?style=flat-square)
![Haesal Logo](https://github.com/HelloWorld017/Haesal/blob/master/public/resources/images/favicon.png)
----
An open-sourced download center project.

## How to install?

```
$ git clone https://github.com/HelloWorld017/Haesal.git
$ npm install
$ npm start
```

## How to edit configs?

1. Open ./config/config.custom.js
2. Add your configures.


* Don't forget to add {} for sub-options.
	```
	ex) config.github = {};
	```

## Documentation
### Configures
##### config.folder_name
The name of default file which has configs of folders.
##### config.exclusion_name
The name of exclusion file which will be used by blacklist folders.
##### config.file_ext
The extension of file information. If you are using Accessibility Partially (Whitelist), only files which have information file will be shown.
##### config.resources_directory
The directory which contains resources folder.
##### config.main_directory
The directory which contains files which will be downloaded.
##### config.default_config
This will be applied to folders which doesn't have folder information file. (config.folder_name)
##### config.read_config
Files will be read using this setting.
##### config.wildcard_auto_sep
If your file separator (/ or &#92;) in wildcards is different with it of your system, it will be changed automatically.
##### config.lang
The language which will be used in html file. (&lt;html lang="en"&gt;)
#### config.block
##### config.block.block_unreachable_files
If you turns on this option, users can get files which are blocked by accessibility.
But, remember, you should not upload files which must not be downloaded to public.
So, I recommend setting this option to false and not putting security-related files into public.
Also, this will check folder.hsfin for every files before being downloaded by users.
This option will not block folders. So, if you want to turn on this option, please set default accessibility to 0.
##### config.block.whitelist
If the requested file matches more than one wildcard in this list, the file will not be blocked.
##### config.block.ignore
If this option is turned on, this will pretend not to exist for requests of blocked files and send 404 Not Found.
If this option is turned off, this will send 403 Forbidden.
#### config.github
##### config.github.client_id & config.github.client_secret
Client ID and Client Secret for API Call.
##### config.github.add_link
If this option is turned on, a small icon will be added to index which has a link to github repository.
##### config.github.use_api_key
If this option is turned off, this will not use client ID and client Secret.
#### config.errors
Contains texts for errors.

### Folder Information file

#### Accessibilities
Folders have 3 accessibility types
1. 0 : No : It will send just a 403.

2. 1 : Partially (Whitelist) : It will send files which have file information and folders which have folder information.

3. 2 : Yes : It will send all files excepts folder information file.

4. 3 : Negative Partially (Blacklist) : It will send all files and folder excepts which are filtered by exclusion file.

#### Folder types
Folders have three type:
1. Local : Local directories.

2. Github: Github directories.

3. List : Directories which returns sub-folders as lists.

#### Documentation
##### accessibility
Accessibility of inner contents. If you want to protect files by direct url access, please turn on config.block options.
##### index
Index filename of the folder. If you don't want to use index, make it to false. The index will be shown instead of title of the folder.
##### index-type
If you want to interpret the file as markdown, set this "markdown". If you want to use html, set this "html".

Also, there is another option. If you are using github folder, setting this as "github" will show README.md.
##### type
The type of the folder. There are three options : "github", "list", "local".
##### github-project, github-author
If you are using GithubFolder, you must set this options.
The github-project option is name of your repository.
The github-author option is name of you or your group.
For example, "github-project": "Haesal", "github-author": "HelloWorld017".

### File Information file

#### Default config
Default of file information files is this :
```
{
	"download": "{File path}"
}
```

#### File types
Files have two types:
1. Local : Local files. (download means path of the file.)

2. Remote : Remote files. (download just means download URL.)

#### Documentation
##### type
Represents the type of your file.
"local" or "remote" is available.
##### download
If you're using remote, it must be the download link of your file.
Otherwise, it must be path of your file.

### Wildcards (Exclusions and Block Whitelist)
[Look at minimatch documentation](https://github.com/isaacs/minimatch)
