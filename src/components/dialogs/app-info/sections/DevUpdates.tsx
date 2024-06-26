import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import {
  ButtonBase,
  Card,
  CardContent,
  CardMedia,
  Skeleton,
  styled,
  Typography
} from '@mui/material';
import DialogSectionHeader from '../../DialogSectionHeader';
import DialogSectionContentCards from '../../DialogSectionContentCards';
dayjs.extend(advancedFormat);

type Vlog = {
  id: string;
  vlogNumber: number;
  videoTitle: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
};

const StyledContent = styled('div')(
  ({ theme }) => `
& {
  display: flex;
  flex-direction: column;
}

& .MuiButtonBase-root {
  width: 100%;
}

& .vlog-entry {
  width: 100%;
  height: auto;
}

& .MuiCard-root {
  display: flex; 
}

& .MuiCardContent-root {
  display: flex;
  flex-direction: column;
  flex-basis: 85%;
  text-align: left;
}

& .MuiCardMedia-root {
  width: 15%; 
  height: 100%;
}

${theme.breakpoints.down('md')} {
  & .vlog-entry-image {
    display: none;
  }

  & .MuiCardContent-root {
    flex-basis: 100%;
  }
}
`
);

const origin =
  typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : '';

let hasFetched = false;
const useVlogApi = () => {
  const [vlogs, setVlogs] = useState<Vlog[] | undefined>(undefined);
  useEffect(() => {
    const fetchData = async () => {
      const request = await fetch(`${origin}/api/vlogs`);
      if (request.status == 200) {
        const response = await request.json();
        setVlogs(response);
        hasFetched = true;
      } else {
        setVlogs([]);
        hasFetched = false;
      }
    };

    if (!hasFetched) {
      fetchData();
    }

    return () => {
      hasFetched = false;
    };
  }, []);

  return vlogs;
};

const standardCard = (i: number) => {
  return (
    <Card key={i} elevation={2}>
      <CardContent>
        <Typography component='div' variant='subtitle1'>
          <Skeleton height={60} />
        </Typography>
        <Typography variant='subtitle1' color='text.secondary' component='div'>
          <Skeleton />
        </Typography>
      </CardContent>
      <Skeleton variant='rectangular' width={100} height={120} />
    </Card>
  );
};

const vlogCard = (v: Vlog) => {
  return (
    <Card key={v.id} elevation={2}>
      <ButtonBase
        onClick={() =>
          window.open(`http://www.youtube.com/watch?v=${v.id}`, 'new')
        }
      >
        <CardContent>
          <Typography component='div' variant='subtitle1'>
            {v.title}
          </Typography>
          <Typography
            variant='subtitle1'
            color='text.secondary'
            component='div'
          >
            {dayjs(v.publishedAt).format('MMM Do, YYYY')}
          </Typography>
        </CardContent>
        <CardMedia
          component='img'
          image={`${v.thumbnailUrl}`}
          alt={`Watch ${v.vlogNumber} now`}
          className={'vlog-entry-image'}
        />
      </ButtonBase>
    </Card>
  );
};

export default function DevUpdates() {
  const vlogs = useVlogApi();
  return (
    <StyledContent className='app-info-section scroll-body'>
      <DialogSectionHeader>Dev Updates / Vlog</DialogSectionHeader>
      <DialogSectionContentCards>
        {vlogs
          ? vlogs.map((v: Vlog) => vlogCard(v))
          : [1, 2, 3].map((_, i) => standardCard(i))}
      </DialogSectionContentCards>
    </StyledContent>
  );
}
