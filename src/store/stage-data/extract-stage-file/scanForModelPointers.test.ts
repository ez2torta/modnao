import { promises as fs } from 'fs';
import path from 'path';

import scanForModelPointers from './scanForModelPointers';

// @TODO use model generation logic when that exists vs
// arbitrary stage test files with more methodical approach

describe('scanForModelPointers',() => {
  it('returns the correct list of model pointer addresses in a stage file', async () => {
    const polygonFile = await fs.readFile(path.join(__dirname, '../../../__mocks__/STGXXPOL.BIN'));
    const results = scanForModelPointers(polygonFile);
    expect(results).toEqual([
      528,   1856,   2784,   3712,   9240,  14248,  19256,
      19288,  19320,  19696,  24704,  29712,  34992,  35712,
      35960,  40280,  45288,  50296,  50544,  55552,  56016,
      60096,  60344,  65352,  70360,  74680,  75400,  76080,
      76976,  78088,  78336,  79664,  79912,  80160,  80408,
      80656,  80904,  81152,  81400,  81784,  82096,  82480,
      82864,  83248,  83560,  83808,  84056,  84440,  85120,
      85368,  85616,  92808,  93488,  94384,  95496,  96824,
      98368, 100128, 102104, 104296, 104544, 104792, 104824,
      104856, 104888, 105136, 105168, 105200, 105448, 105696,
      105944, 105976, 108320, 108352, 108384, 108416, 108448,
      108696, 108944, 109256, 109288, 109320, 109352 
    ]);
  });
});
