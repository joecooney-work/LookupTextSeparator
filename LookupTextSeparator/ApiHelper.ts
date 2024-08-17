import { IInputs } from "./generated/ManifestTypes";//outputs not needed here..
//import * as $ from 'jquery'; not needed atm
import 'jquery-ui/ui/widgets/autocomplete';


// Helper Class
// 05.09.2024
// Joe Cooney
export class ApiHelper {
    private url: string;
    private _context: ComponentFramework.Context<IInputs>;
    public primaryNameAttirbute: string;
    public primaryIdAttribute: string;
    private entityName: string;
    constructor(context: ComponentFramework.Context<IInputs>, tableName: string) {
        this.url = window.location.href ? window.location.href.split("?")[0] : "";
        this._context = context;
        this.entityName = tableName;
        if(this.url == "" || this.entityName == "") 
            this.alertMissingURL();
    }

    public async getRecordsByAttribute(entityName: string, attributeName: string, value: string): Promise<ComponentFramework.WebApi.RetrieveMultipleResponse> {
        try {
            const query = `?$select=${attributeName}&$filter=contains(${attributeName}, '${value}')`;
            const records = await this._context.webAPI.retrieveMultipleRecords(entityName, query);
            return records;
        } catch (error) {
            console.error("Error retrieving records: ", error);
            throw error;
        }
    }
    

    public getTableMetadata(): void {
        this._context.utils.getEntityMetadata(this.entityName, ["PrimaryIdAttribute", "PrimaryNameAttribute"]).then(
            (response) => {
                if (response.PrimaryNameAttribute) 
                    this.primaryNameAttirbute = response.PrimaryNameAttribute;
                if (response.PrimaryNameAttribute) 
                    this.primaryIdAttribute = response.PrimaryIdAttribute;
                //testing
                console.log("Primary Name Attribute:", this.primaryNameAttirbute);
                console.log("Primary Id Attribute:", this.primaryIdAttribute);                                    
            },
            (error) => {
                console.error("Error retrieving EntityDefinitions:", error);
            }
        );
    }



    private alertMissingURL(){
        alert("Error: Unable to locate window URL or no Table Name was set, please refresh the browser. If the problem persists contact support.");
    }
}