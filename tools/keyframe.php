<?php
/*
	Utility extracts the keyframe information needed to play a splined "boxplorer2"
	animation from the various config files and condenses the info for easy use 
	from JavaScript.

	usage: php keyframe.php default.cfg keyframe
*/


function parseTextFile($txt_file){
	$rows = explode("\n", $txt_file);
	array_shift($rows);

	print "{ ";
	
	$i= 0;
	foreach($rows as $row => $data) {
		//gets: loop, time, delta_time, speed, position, direction & upDirection
		$row_data = explode(' ', $data);

		$key           = $row_data[0];		
		if (preg_match('~\b(loop|time|delta_time|speed)\b~i',$key)) {
			if ($i > 0) print ", ";
		
			print $key.": ".floatval(trim($row_data[1]));
		//	print $key.": ".trim($row_data[1]);
			$i++;
		} else if (preg_match('~\b(position|direction|upDirection)\b~i',$key)) {
			if ($i > 0) print ", ";
			print $key.": [".floatval(trim($row_data[1])).", ".floatval(trim($row_data[2])).", ".floatval(trim($row_data[3]))."]";
			$i++;
		}
	}
	print " }";
}

$frameCfgName=  $argv[1] ? $argv[1] : 'default.cfg';
$frameFilesPrefix=  $argv[2] ? $argv[2] : 'keyframe';;

$txt_file = file_get_contents($frameCfgName);
	
print "{ 
main: ";
parseTextFile($txt_file);
	
print ",  
keyFrames: [";

for ($i= 0; $i < 1000; $i++) {
	$frameName= $frameFilesPrefix."-".$i.".cfg";
	$txt_file = file_get_contents($frameName);
	if ($txt_file == false) break;

	if ($i > 0) print ", 
";

	parseTextFile($txt_file);	
}

	print " ]
}";
	
?>