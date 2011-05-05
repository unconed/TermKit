#!/bin/sh
loc=0
dirs="HTML Node"

mv HTML/socket.io .
mv Node/socket.io-node .
mv HTML/external .

for dir in $dirs; do
    files=`find $dir -type f | egrep -v "svn" | egrep -v "(DS_Store|pdf|svn|sql|png|txt|swfupload)"`
    lines=`wc -l $files | tail -1 | sed "s/total//g"`
    loc=$(($loc + $lines))
    echo $files
done

mv socket.io HTML
mv socket.io-node Node
mv external HTML

echo Lines of code: $loc
