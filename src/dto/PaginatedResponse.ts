export class PaginatedResponse<T> {
  data: T[];
  moreAvailable: boolean;

  constructor(d: T[], more: boolean) {
    this.data = d;
    this.moreAvailable = more;
  }
}

export class CursorPaginatedResponse<T> {
  data: T[];
  cursor: number | null;

  constructor(d: T[], cursor: number | null) {
    this.data = d;
    this.cursor = cursor;
  }
}
