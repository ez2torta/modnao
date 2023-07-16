import type { NextApiRequest, NextApiResponse } from 'next';

const YT_API_URL = `https://www.googleapis.com/youtube/v3/playlistItems`;
const Q = {
  Playlist: `playlistId=${process.env.PLAYLIST_ID}`,
  ApiKey: `key=${process.env.MODNAO_GAPI_KEY}`
};

export interface YTPlaylistItem {
  contentDetails: {
    videoId: string;
    videoPublishedAt: string;
  };
  snippet: {
    title: string;
    description: string;
    tags: string;
    thumbnails: {
      standard: {
        url: string;
      };
    };
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const URL = `${YT_API_URL}?${Q.Playlist}&${Q.ApiKey}&maxResults=50&part=snippet,contentDetails`;
  const response = await (await fetch(URL)).json();
  if (Array.isArray(response.items)) {
    res.status(200).json(
      response.items.map((i: YTPlaylistItem) => ({
        id: i.contentDetails.videoId,
        title: i.snippet.title,
        description: i.snippet.description,
        thumbnailUrl: i.snippet.thumbnails.standard.url,
        source: i
      }))
    );
  } else {
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
}
