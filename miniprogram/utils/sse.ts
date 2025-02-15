export class SSE {
    private eventSource: EventSource;
  
    constructor(url: string, params: Record<string, string>) {
      const query = new URLSearchParams(params).toString();
      this.eventSource = new EventSource(`${url}?${query}`);
    }
  
    onMessage(callback: (data: any) => void) {
      this.eventSource.onmessage = (event) => {
        callback(JSON.parse(event.data));
      };
    }
  
    close() {
      this.eventSource.close();
    }
  }