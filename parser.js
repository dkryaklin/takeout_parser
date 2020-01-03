const readline = require('linebyline');
const https = require('https');
const fs = require('fs');
const moment = require('moment');

const exiftool = require('node-exiftool');
const exiftoolBin = require('dist-exiftool');

// ep
//     .open()
//     .then((pid) => console.log('Started exiftool process %s', pid))
//     .then(() => ep.readMetadata('test.jpg', ['-File:all']))
//     .then(console.log, console.error)
//     .then(() => ep.close())
//     .then(() => console.log('Closed exiftool'))
//     .catch(console.error);

let arr = [];
let skipped = 0;

let timestamp;

rl = readline('./Hangouts.json');

rl
    .on('line', function (line) {
        if (line.indexOf('"timestamp": "') !== -1) {
            timestamp = line.split('"')[3];
        }

        if (line.indexOf('"url": "https://lh') !== -1) {
            const url = line.split('"')[3];

            arr.push({
                timestamp,
                url,
            });
        }
    })
    .on('error', function (e) {
        console.log(e);
    })
    .on('close', async function () {
        for (let i = 0; i < arr.length; i++) {

            await new Promise((resolve) => {
                https.get(arr[i].url, function (response) {
                    if (response.headers['content-disposition']) {

                        const filename = response.headers['content-disposition'].split('"')[1] || 'photo';
                        const path = `./photos/${filename}_${i}.jpg`;

                        const createDate = new Date(Math.round(arr[i].timestamp / 1000));
                        const createDateFormat = moment(createDate).format('YYYY:MM:DD HH:mm:ss');

                        const file = fs.createWriteStream(path);
                        response.pipe(file);

                        console.log(`processed #${i + 1}/${arr.length}`);

                        new Promise(() => {
                            const ep = new exiftool.ExiftoolProcess(exiftoolBin);

                            ep
                                .open()
                                .then(() => {
                                    ep.writeMetadata(path, {
                                        DateTimeOriginal: createDateFormat,
                                        CreateDate: createDateFormat,
                                    }, ['overwrite_original'])
                                })
                                .then(() => {
                                    ep.close();
                                    resolve();
                                })
                                .catch(console.error);
                        });
                    } else {
                        skipped++;
                        console.log(`skip #${i}; skipped total ${skipped}`);

                        resolve();
                    }
                });
            })
        };
    });
