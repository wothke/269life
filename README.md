Another little fractal graphics/THREE.js experiment that can be seen in action
here: https://www.wothke.ch/269life/ (and a youtube recording can be found here:
https://www.youtube.com/watch?v=Y3S3MY3Vuf4).

The demo is dedicated to 269Life and the matching title is meant to attract some 
extra attention to that meaningful movement (see http://www.269life.com).

The page is the result of some "just for fun" programming used to explore the 
features of WEBGL. (Spoiler: as such it contains a "greetings" section that is 
dedicated to other people that have done or are still producing beautiful 
"just for fun" stuff in the demoscene context..)

Credits: 

1) The renderings used in this demo are based on the 'pseudo kleinian' algorithm by 
Knighty (see Fragmentarium examples). The used 'distance function' variations were 
derived by experimentation and inspired by different work in the 
http://www.fractalforums.com (e.g. by Crist-JRoger, et al.). 

2) I've migrated parts of "boxplorer2" for use with THREE.js/WEBGL such that 
"boxplorer2" could be used to edit the camera path. It also provides the base 
for the z-buffer calculation. Thanks to Marius for some helpful suggestions.

3) This page would not have been possible without the many clever algorithms for things like: 
Blinn Phong reflection, ambient  occlusion (Alex Evans), bokeh (David Hoskins), random 
noise (Inigo Quilez), etc (see page's source code for more detailed references).

4) The bundled song 'Dark Grey' was created by Wolf Budgenhagen (see https://www.wrightandbastard.com/ )
and the song 'Ashley Walbridge Africa(Darkmelo Edit)' was created by Darkmelo
(see https://soundcloud.com/ulquiorra-ben-hafsa) and music is used here with their consent. 
Reminder: The fact that I've been authorized to use the music in my demo here does not 
necessarily mean that the music may also be freely used elsewhere. Please get in touch with 
the authors to get their OK for whatever you might want to do with it.
 
5) The "free" fonts used are '1942 report' from fontsquirrel.com", 'Vertigo' by Brian Kent" and
'Mountains of Christmas' from fonts.google.com


Project files:

This project contains all the files used by my live web page (usually minified). In addition it then 
contains a "source_code" folder with the original program source code and a "source_res" folder with some
raw/work versions of used resource files. The "tools" folder then contains a little PHP script that
may be used to extract camera-path information from "boxplorer2" configuration files (which allows 
to use "boxplorer2" as an editor for the camera-path).

The main purpose of this project is to provide me with an externally stored backup of my 
sources. The core raymarching/fractal impl is in "util.box2kleinians.js" and anybody trying to 
recreate "boxplorer2" in WEBGL/THREE.js will find some useful groundwork in there.


Copyright (C) 2017 Juergen Wothke


Terms of Use: This software (except for the music and used 3rd party logos) is licensed under a CC BY-NC-SA 
(http://creativecommons.org/licenses/by-nc-sa/4.0/). 



PS: additional background information can be found here: https://wordpress.com/post/jwothke.wordpress.com/720