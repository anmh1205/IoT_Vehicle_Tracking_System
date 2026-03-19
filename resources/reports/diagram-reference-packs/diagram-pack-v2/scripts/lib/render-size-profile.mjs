const startsWithDirective = (source, directive) => source.trimStart().startsWith(directive);

export const getRenderSize = (sourceCode, renderProfile) => {
  if (startsWithDirective(sourceCode, "sequenceDiagram")) {
    return { width: renderProfile.sequenceWidth, height: renderProfile.sequenceHeight };
  }
  if (startsWithDirective(sourceCode, "stateDiagram")) {
    return { width: renderProfile.stateWidth, height: renderProfile.stateHeight };
  }
  if (startsWithDirective(sourceCode, "mindmap")) {
    return { width: renderProfile.mindmapWidth, height: renderProfile.mindmapHeight };
  }
  if (startsWithDirective(sourceCode, "gantt")) {
    return { width: renderProfile.ganttWidth, height: renderProfile.ganttHeight };
  }
  if (startsWithDirective(sourceCode, "xychart-beta")) {
    return { width: renderProfile.xychartWidth, height: renderProfile.xychartHeight };
  }
  if (startsWithDirective(sourceCode, "radar-beta")) {
    return { width: renderProfile.radarWidth, height: renderProfile.radarHeight };
  }
  if (startsWithDirective(sourceCode, "block-beta")) {
    return { width: renderProfile.blockWidth, height: renderProfile.blockHeight };
  }
  if (startsWithDirective(sourceCode, "erDiagram")) {
    return { width: renderProfile.erWidth, height: renderProfile.erHeight };
  }
  return { width: renderProfile.defaultWidth, height: renderProfile.defaultHeight };
};
