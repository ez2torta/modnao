import resourceAttribMappings from '@/constants/resourceAttribMappings';

const mappingsByFilename = Object.values(resourceAttribMappings).filter(
  (attribs) => attribs.filenamePattern || attribs.textureDefsHash
);

export default function getResourceAttribs(hash: string, fileName: string) {
  const hashEntry = resourceAttribMappings[hash];

  const foundResource =
    hashEntry && new RegExp(hashEntry.filenamePattern, 'i').test(fileName);
  if (foundResource) {
    return hashEntry;
  }

  const fileNameAndHashMatch = Object.values(resourceAttribMappings).find(
    (attribs) =>
      attribs.textureDefsHash === hash &&
      new RegExp(attribs.filenamePattern, 'i').test(fileName)
  );

  if (fileNameAndHashMatch) {
    return fileNameAndHashMatch;
  }

  const matchedResources = mappingsByFilename.filter((attribs) =>
    new RegExp(attribs.filenamePattern, 'i').test(fileName)
  );

  const concreteMatches = matchedResources.filter(
    ({ isGenericFallback, textureDefsHash }) =>
      !isGenericFallback && !textureDefsHash
  );
  const matchedGames = new Set(
    matchedResources
      .filter(({ isGenericFallback }) => !isGenericFallback)
      .map(({ game }) => game)
  );

  if (matchedGames.size === 1 && concreteMatches.length) {
    return concreteMatches[0];
  }

  return matchedResources.find(({ isGenericFallback }) => isGenericFallback);
}
