export default {
  // Success
  contentSent: 'Content sent successfully',
  contentQueued: 'Content added to queue',
  contentSentToPages: 'Content sent to {count}/{total} page(s)',

  // Errors
  noContent: 'No content to send',
  noDestination: 'Select a destination page',
  sendError: 'Error sending content',
  errorsOnPages: 'Errors on {count} page(s)',

  // Confirmations
  confirmClearClipboard: 'Clear clipboard?',

  // Placeholders for interpolation
  sentToCount: 'Content sent to {count}/{total} page(s)',
  queuedForCount: 'Content queued for {count} page(s)',
} as const;
