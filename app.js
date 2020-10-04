'use strict';

const fs = require('fs');
const http = require('http');
const PORT = 3330 || process.env.PORT;
const src = "sample.pdf" //source of the pdf file for which thumbnail is to be created
const hummus = require('hummus');
const streams = require('memory-streams');
const { input } = require('node-pdftocairo');
const imageToBase64 = require('image-to-base64');


const PDFRStreamForBuffer = require('./pdfr-stream-for-buffer.js');
var Blob = require('blob');
// https://stackoverflow.com/questions/42512982/node-js-get-the-first-page-of-pdf-buffer  => getting buffer array for the first page 
const getFirstPage = function (buffer) {
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
function pdf2thumb(buf) {
    let ResImg = buf;

    return ResImg;

}


http.createServer(function (req, res) {
    fs.readFile(src, async (err, data) => {

        try {
            let firstPageBuffer = getFirstPage(data); //buffer array for the first page of the given document
            var file_name = Math.random()
            await input(firstPageBuffer, { format: 'png' }).output(file_name);      //saving a temporary file
            imageToBase64(file_name + "-1.png")                                    //converting temporary file into base64 
                .then(
                    (response) => {
                        fs.unlink(file_name+ "-1.png", (err => {                    //removing temporary file as our work is done
                            if (err) console.log(err);
                        }));
                                        //rendering base64 string image
                        var html_response = `<!DOCTYPE html>                          
                        <html><body><img style='display:block; width:100px;height:100px;' id='base64image' src='data:image/jpeg;base64, ${response}' /></body></html>`
                        res.write(html_response, () => {
                            console.log('first page displayed')
                        })
                        
                        res.end()
                    }
                )
                .catch(
                    (error) => {
                        console.log(error); // Logs an error if there is
                    }
                )
        }
        catch (err) {
            console.log(err);
        }
    })
}).listen(PORT, () => console.log(`Server Started @ ${PORT}`)); 