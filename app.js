'use strict';

const fs = require('fs');
const http = require('http');
const PORT = 3330 || process.env.PORT;
const src = "" //source of the pdf file for which thumbnail is to be created
const hummus = require('hummus');
const streams = require('memory-streams');
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
    let ResImg=buf;

    // console.log(typeof(ResImg));
    // // console.log(ResImg)

    // try{
    //      // 'image/jpeg'
    //     var keys = [];
    //     for (var k in ResImg) {
    //         if (k.hasOwnProperty(k)) {
    //         keys.push(k);
    //         }
    //     }
    //     console.log(typeof(keys));

    //     let blob = new Blob(keys, {type : 'image/jpeg'});
    
    // return blob;
    // }
    // catch(err){
    //     console.log("error :::" + err);
    // }
    return buf;
   
  }
  

http.createServer(function (req, res) {
   fs.readFile(src,(err,data)=>{
       try{
            let firstPageBuffer = getFirstPage(data); //buffer array for the first page of the given document



            var htmlElement = pdf2thumb(firstPageBuffer); //converting the buffer array of first page of pdf to html element to be returned
            res.write( htmlElement,()=>{
                console.log('first page displayed')
            })
           

           

            res.end()
        }
        catch(err){
            console.log(err);
        }
   }) 
  }).listen(PORT,()=>console.log(`Server Started @ ${PORT}`)); 