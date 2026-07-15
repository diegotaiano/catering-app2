import { Readable } from 'stream';
import {
  ServicePrincipalCredentials,
  PDFServices,
  MimeType,
  CreatePDFJob,
  CreatePDFResult
} from '@adobe/pdfservices-node-sdk';

// Formati che sappiamo convertire in PDF tramite Adobe (oltre a immagini/PDF,
// già gestiti direttamente in pdf.js senza bisogno di conversione).
const MIME_CONVERTIBILI = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': MimeType.DOCX, // .docx
  'application/msword': MimeType.DOC, // .doc
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': MimeType.XLSX, // .xlsx
  'application/vnd.ms-excel': MimeType.XLS, // .xls
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': MimeType.PPTX, // .pptx
  'application/vnd.ms-powerpoint': MimeType.PPT // .ppt
};

export function eConvertibile(tipoMime) {
  return Boolean(MIME_CONVERTIBILI[tipoMime]);
}

async function streamInBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// Converte un buffer docx/xlsx/pptx (o doc/xls/ppt) in un Buffer PDF, usando
// Adobe PDF Services. Richiede ADOBE_CLIENT_ID e ADOBE_CLIENT_SECRET nell'ambiente.
// Se le credenziali non sono configurate, o la conversione fallisce, ritorna null
// (l'allegato originale resta comunque scaricabile dall'app, solo non incorporato nel PDF).
export async function convertiInPdf(buffer, tipoMime) {
  const mimeAdobe = MIME_CONVERTIBILI[tipoMime];
  if (!mimeAdobe) return null;

  if (!process.env.ADOBE_CLIENT_ID || !process.env.ADOBE_CLIENT_SECRET) {
    console.warn('ADOBE_CLIENT_ID/SECRET non configurati: salto la conversione di questo allegato.');
    return null;
  }

  try {
    const credentials = new ServicePrincipalCredentials({
      clientId: process.env.ADOBE_CLIENT_ID,
      clientSecret: process.env.ADOBE_CLIENT_SECRET
    });
    const pdfServices = new PDFServices({ credentials });

    const inputAsset = await pdfServices.upload({
      readStream: Readable.from(buffer),
      mimeType: mimeAdobe
    });

    const job = new CreatePDFJob({ inputAsset });
    const pollingURL = await pdfServices.submit({ job });
    const risposta = await pdfServices.getJobResult({ pollingURL, resultType: CreatePDFResult });

    const assetRisultato = risposta.result.asset;
    const streamAsset = await pdfServices.getContent({ asset: assetRisultato });

    return await streamInBuffer(streamAsset.readStream);
  } catch (err) {
    console.error('Conversione Adobe PDF Services fallita:', err.message);
    return null;
  }
}
