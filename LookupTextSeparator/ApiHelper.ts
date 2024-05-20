// Helper Class
// 05.09.2024
// Joe Cooney
export class ApiHelper {
    private url: string;

    constructor(URL: string) {
        this.url = URL;
    }

    public fetchRecords(searchValue: string): Promise<{ name: string }[]> {
        // Implement the API call to fetch records using the passed URL
        return fetch(`${this.url}/api/data/v9.1/records?search=${searchValue}`)
            .then(response => response.json())
            .then(data => {
                return data.records;
            });
    }
}