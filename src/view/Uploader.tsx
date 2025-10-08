import axios from 'axios';
import JSZip from 'jszip';
import Dark from './previews/Dark';
import Light from './previews/Light';
import ReactDOMServer from 'react-dom/server';
import { useAuth } from '@crossmint/client-sdk-react-ui';
import type { DomainContent, UploaderProps } from '../types';
import { Box } from '../components/Box';

export default function Uploader({
  setActiveStep,
  selectedTheme,
  userName,
  bio,
  urlButtons,
  setDeploymentTaskId,
  setSnackbar,
  setLoading,
}: UploaderProps) {
  const { user } = useAuth();
  const backendBase = import.meta.env.VITE_BACKEND_BASE_URL as string;
  const everlandHostingBase = import.meta.env
    .VITE_4EVERLAND_HOSTING_BASE_URL as string;
  const everlandTokenId = import.meta.env.VITE_TOKEN_ID as string;
  const everlandProjectId = import.meta.env.VITE_PROJECT_ID as string;
  const everlandIPFSProjectId = import.meta.env.VITE_IPFS_PROJECT_ID as string;
  const backendBaseUrl = import.meta.env.VITE_BACKEND_BASE_URL as string;
  const IPFSBaseUrl = import.meta.env.VITE_IPFS_BASE_URL as string;
  const shortIoUrl = import.meta.env.VITE_SHORT_IO_BASE_URL as string;
  const domain = import.meta.env.VITE_DOMAIN as string;
  const apiKey = import.meta.env.VITE_SHORT_IO_API_KEY as string;

  const saveDeploymentData = async (
    id: string | number | undefined,
    arweaveContent: DomainContent,
    ipfsContent: DomainContent
  ) => {
    if (!id) {
      setSnackbar({
        open: true,
        message: 'Authentication Failed. Please try again.',
        severity: 'error',
      });
      setTimeout(() => (window.location.href = '/'), 1000);
      return;
    }
    try {
      const response = await axios.post(
        `${backendBase}/api/deploymentHistory/create`,
        {
          id,
          provider: 'gmail',
          arweaveContent,
          ipfsContent,
        }
      );
      return response;
    } catch (error) {
      console.error('Error saving deployment data:', error);
    }
  };

  const generateCustomURL = async (taskId: string) => {
    console.log('Generating custom URL for taskId:', taskId);
    if (!taskId) {
      return;
    }

    try {
      const response = await axios.post(
        shortIoUrl,
        {
          originalURL: `${IPFSBaseUrl}/${taskId}`,
          domain,
        },
        {
          headers: {
            authorization: apiKey,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error shortening URL:', error);
    }
  };

  const saveDomainData = async (
    taskId: string,
    latestLink: string,
    shortIoId: string
  ) => {
    if (!taskId || !latestLink || !shortIoId) {
      setSnackbar({
        open: true,
        message: 'Oops! Something went wrong. Please try again.',
        severity: 'error',
      });
      setTimeout(() => (window.location.href = '/'), 1000);
      return;
    }

    try {
      await axios.put(`${backendBaseUrl}/api/deploymentHistory/${taskId}`, {
        customUrl: latestLink,
        shortUrlId: shortIoId,
      });
      setLoading(false);
    } catch (error) {
      console.error('Error saving domain data:', error);
      setSnackbar({
        open: true,
        message: 'Server Error. Please try again.',
        severity: 'error',
      });
      setTimeout(() => (window.location.href = '/'), 1000);
    }
  };

  const uploadHTMLFile = async (file: Blob) => {
    const arweaveFormData = new FormData();
    arweaveFormData.append('file', file);
    arweaveFormData.append('projectId', everlandProjectId);

    try {
      const arweaveUploadResponse = await axios.post(
        `${everlandHostingBase}/deploy`,
        arweaveFormData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            token: everlandTokenId,
          },
        }
      );

      const arweaveContent = arweaveUploadResponse?.data?.content;
      const arweaveTaskId = arweaveContent?.taskId;

      const ipfsFormData = new FormData();
      ipfsFormData.append('file', file);
      ipfsFormData.append('projectId', everlandIPFSProjectId);

      const ipfsUploadResponse = await axios.post(
        `${everlandHostingBase}/deploy`,
        ipfsFormData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            token: everlandTokenId,
          },
        }
      );

      const ipfsContent = ipfsUploadResponse?.data?.content;
      const ipfsTaskId = ipfsContent?.taskId;
      const ipfsFileHash = ipfsContent?.fileHash;

      setDeploymentTaskId({ arweaveTaskId, ipfsTaskId });
      const authId = user?.id;
      await saveDeploymentData(authId, arweaveContent, ipfsContent);
      const customUrlData = await generateCustomURL(ipfsFileHash);
      await saveDomainData(
        arweaveTaskId,
        customUrlData?.shortURL,
        customUrlData?.idString
      );
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handleMintData = async () => {
    let themeComponent;

    switch (selectedTheme) {
      case 'Dark Theme':
        themeComponent = (
          <Dark userName={userName} bio={bio} urlButtons={urlButtons} />
        );
        break;
      case 'Light Theme':
        themeComponent = (
          <Light userName={userName} bio={bio} urlButtons={urlButtons} />
        );
        break;
      default:
        return null;
    }

    const themeHTML = ReactDOMServer.renderToString(themeComponent);

    const fullHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">         
            <style>
              body { width: 90%; margin-left:auto; margin-right:auto }
              @media (min-width: 768px) and (max-width: 1024px) {
                body {
                  width: 60%;
                }
              }
              @media (min-width: 1024px) {
                body {
                  width: 30%;
                }
              }
              div {
                box-sizing: border-box;
              }
            </style>
          </head>
          <body>
            <div>${themeHTML}</div>
          </body>
        </html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });

    const zip = new JSZip();
    zip.file('index.html', blob);

    const zipBlob = await zip.generateAsync({ type: 'blob' });

    uploadHTMLFile(zipBlob);
  };

  const handleBack = () => setActiveStep(0);
  const handleMint = async () => {
    setLoading(true);
    await handleMintData();
    setActiveStep(2);
  };

  return (
    <Box className='flex gap-5 mt-3'>
      <button
        type='button'
        className='flex justify-center px-4  py-3 w-full bg-transparent border border-[#1ab4a3] text-[#1ab4a3] rounded-lg font-bold cursor-pointer'
        onClick={handleBack}
      >
        Back
      </button>
      <button
        className='flex justify-center px-4 py-3 w-full bg-[#1ab4a3] border  border-[#1ab4a3] text-white rounded-lg font-bold cursor-pointer'
        onClick={handleMint}
      >
        Next
      </button>
    </Box>
  );
}
