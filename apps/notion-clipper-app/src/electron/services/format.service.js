class FormatHandlerRegistry {
  constructor() {
    this.handlers = new Map();
    this.registerDefaultHandlers();
  }

  registerDefaultHandlers() {
    // Enregistrer les handlers par défaut
    this.register('table', {
      detect: (content) => /^\|.*\|.*\|/.test(content) || /<table/.test(content),
      parse: (content) => this.parseTable(content)
    });
    this.register('code', {
      detect: (content) => /^```/.test(content) || /^    /.test(content),
      parse: (content) => this.parseCode(content)
    });
    this.register('url', {
      detect: (content) => /^https?:\/\//.test(content.trim()),
      parse: (content) => this.parseUrl(content)
    });
  }

  register(name, handler) {
    this.handlers.set(name, handler);
  }

  detect(content) {
    for (const [name, handler] of this.handlers) {
      if (handler.detect(content)) {
        return name;
      }
    }
    return 'text';
  }

  parse(content, type = 'auto') {
    if (type === 'auto') {
      type = this.detect(content);
    }
    const handler = this.handlers.get(type);
    if (handler && handler.parse) {
      return handler.parse(content);
    }
    return [{ type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content } }] } }];
  }

  // Méthodes de parsing spécifiques
  parseTable(content) {
    // Implémentation basique
    return [{ type: 'table', table: { children: [] } }];
  }

  parseCode(content) {
    const language = content.match(/^```(\w+)/)?.[1] || 'plain text';
    const code = content.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
    return [{
      type: 'code',
      code: {
        rich_text: [{ type: 'text', text: { content: code } }],
        language
      }
    }];
  }

  parseUrl(url) {
    return [{
      type: 'bookmark',
      bookmark: { url: url.trim() }
    }];
  }
}

module.exports = new FormatHandlerRegistry(); 