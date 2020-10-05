'use strict';

const fs = require('fs');
const fsPromises = fs.promises;

const http = require('http');
const PORT = 3330 || process.env.PORT;
const src = "http://www.nitjsr.ac.in/uploads/NIRF-2020%20INDIA%20RANK%20(ENGINEERING).pdf" //source of the pdf file for which thumbnail is to be created it may be local file or link of pdf

const hummus = require('hummus');
const streams = require('memory-streams');
const { input } = require('node-pdftocairo');
const imageToBase64 = require('image-to-base64');
const download = require('download');
const { compress } = require('compress-images/promise');


const PDFRStreamForBuffer = require('./pdfr-stream-for-buffer.js');
var Blob = require('blob');
// https://stackoverflow.com/questions/42512982/node-js-get-the-first-page-of-pdf-buffer  => getting buffer array for the first page 
const getFirstPage = async function (src) {

    if (src.includes("http://") || src.includes("https://")) {                  // reading file if it contains http(s):// then read from url or read from local file
        var buffer = await download(src);                                   //downloading remote file as a buffer
        console.log("reading from url")
    }
    else {
        buffer = await fsPromises.readFile(src);                               //reading local file 
        console.log("reading from local storage")
    }

    //Creating a stream, so hummus pushes the result to it
    let outStream = new streams.WritableStream();
    //Using PDFStreamForResponse to be able to pass a writable stream
    let pdfWriter = hummus.createWriter(new hummus.PDFStreamForResponse(outStream));

    //Using our custom PDFRStreamForBuffer adapter so we are able to read from buffer
    let copyingContext = pdfWriter.createPDFCopyingContext(new PDFRStreamForBuffer(buffer));
    //Get the first page.
    copyingContext.appendPDFPageFromPDF(0);

    //We need to call this as per docs/lib examples
    pdfWriter.end();

    //Here is a nuance.
    //HummusJS does it's work SYNCHRONOUSLY. This means that by this line
    //everything is written to our stream. So we can safely run .end() on our stream.
    outStream.end();

    //As we used 'memory-stream' and our stream is ended
    //we can just grab stream's content and return it
    return outStream.toBuffer();
};
async function pdf2thumb(src) {

    try {
        let firstPageBuffer = await getFirstPage(src); //buffer array for the first page of the given document
        var file_name = Math.random()
        // png jpeg tiff ps eps pdf svg
        const INPUT_path_to_your_images = './' + file_name + '.jpg';

        await input(firstPageBuffer, { format: 'jpeg', singlefile: true }).output(file_name);      //saving a temporary file

        await compress({                                                                       //compressing image file
            source: INPUT_path_to_your_images,
            destination: './compressed_',
            params: { compress_force: true, statistic: false, autoupdate: false },
            enginesSetup: {
                jpg: { engine: 'mozjpeg', command: ['-quality', '5'] },
            }
        });

        fs.unlink(file_name + ".jpg", (err => {                                 //removing uncompressed file
            if (err) console.log(err);
        }));

        let response = await imageToBase64("compressed_" + file_name + ".jpg")  //converting compressed file into base64 

        fs.unlink("compressed_" + file_name + ".jpg", (err => {                 //removing compressed file as our work is done
            if (err) console.log(err);
        }));

        var html_response = `<!DOCTYPE html><html><body><center><a href="${src}"><img style='display:block; width:300px;height:400px;' id='base64image' src='data:image/jpeg;base64, ${response}' /></a><a href="data:image/jpeg;base64, ${response}" download><button>Download</button></a></center></body></html>`
        return html_response;
    }
    catch (err) {
        console.log(err);
    }
}


http.createServer(async function (req, res) {
    try {

        
        var htmlElement = await pdf2thumb(src); //converting the buffer array of first page of pdf to html element to be returned
        res.write(htmlElement, () => {
            console.log('first page displayed')
        })
        res.end()
    }
    catch (err) {
        console.log(err);
        res.write("Something Went Wrong:"+err.message)
        res.end()
    }
}).listen(PORT, () => console.log(`Server Started @ ${PORT}`)); 