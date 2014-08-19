/**
*Object parser(jsonString)
*/
function parser(jsonString)
{
	this.jsonString = jsonString;
	this.pointer = 0;
	this.token="";
	this.length = jsonString.length;
	this.objectLevel = 0;
	this.arrayLevel = 0;
}

//Get next token of this.jsonString to this.token at this.pointer
parser.prototype.getNextToken = function()
{
	this.token = this.jsonString.charAt(this.pointer);
	while(this.token == ' ' || this.token == '\t' || this.token == '\n' )
	{
		this.pointer++;
		this.token = this.jsonString.charAt(this.pointer);
	}
	this.pointer++;
	return this.token;
}

parser.prototype.parseJson = function()
{
	if(this.getNextToken() == '{')this.parseJsonObject();
	else this.errorExpected('{');
}

//parse JSON object.
parser.prototype.parseJsonObject = function()
{
	this.objectLevel++;
	while(this.getNextToken() != '}' && this.pointer <= this.length)
	{			
		switch(this.token)
		{
			case '"':this.parseJsonPair();break;
			default: this.errorExpected('} or "');break;
		}
	}
	alert('JSON level ' + this.objectLevel + ' ended');
	this.objectLevel--;
//			if(this.getNextToken())alert("No more characters are expected");	//not true
}

//because JSON is name:value pair. Parse string, than parse value
//TODO:true false null, make parseValue so parse array can be simpler
parser.prototype.parseJsonPair = function()
{
	if(this.token == '"')this.parseJsonString();
	else this.errorExpected('"')
	if(this.getNextToken() != ':')this.errorExpected(':');
	else 
	{
		this.parseJsonValue();
	}
	this.getNextToken()
	//if(this.token != ',' || this.token != '}')this.errorExpected(', or }');
	if(this.token == ','){alert('pair ended');this.getNextToken();this.parseJsonPair();}
	else if(this.token == '}'){alert('json ended');this.pointer--;}
	else this.errorExpected(', }');
}

parser.prototype.parseJsonValue = function()
{
		this.getNextToken()
		if(this.token == '"')this.parseJsonString();
		else if(this.token == 't')this.parseJsonTrue();
		else if(this.token == 'f')this.parseJsonFalse();
		else if(this.token == 'n')this.parseJsonNull();
		else if(this.token == '[')this.parseJsonArray();
		else if(this.token == '{')this.parseJsonObject();
		else if(this.token == '-')this.parseJsonNumber();
		else if(!isNaN(this.token))this.parseJsonNumber();
		else this.errorExpected('[ { NUMBER STRING true false null');
}
parser.prototype.parseJsonTrue = function()
{
	var start = this.pointer - 1;

	while(this.token != ',' && this.token != '}' && this.token != ']'){this.getNextToken();}
	var value = this.jsonString.substring(start, --this.pointer);
	if(value.trim() != "true")alert('expected true got '+ value);
}
parser.prototype.parseJsonFalse = function()
{
	var start = this.pointer - 1;

	while(this.token != ',' && this.token != '}' && this.token != ']'){this.getNextToken();}
	var value = this.jsonString.substring(start, --this.pointer);
	if(value.trim() != "false")alert('expected false got '+ value);

}
parser.prototype.parseJsonNull = function()
{
	var start = this.pointer - 1;

	while(this.token != ',' && this.token != '}' && this.token != ']'){this.getNextToken();}
	var value = this.jsonString.substring(start, --this.pointer);
	if(value.trim() != "null")alert('expected null got '+ value);
}
//TODO escaping
parser.prototype.parseJsonString = function()
{
	while(this.getNextToken() != '"'){}
}

parser.prototype.parseJsonNumber = function()
{
	var start = this.pointer - 1;

	while(this.token != ',' && this.token != '}' && this.token != ']'){this.getNextToken();}
	var number = this.jsonString.substring(start, --this.pointer);
	if(isNaN(number))alert('expected NUMBER got '+ number);
}
//array can be any type of above. combined, nested
parser.prototype.parseJsonArray = function()
{
	this.arrayLevel++;
	while(this.getNextToken() != ']')
	{
		this.pointer--;
		this.parseJsonValue();
		this.getNextToken();
		if(this.token == ']')break;
		if(this.token != ',')this.errorExpected(',');
	}
	alert('array level ' + this.arrayLevel + 'ended');
	this.arrayLevel--;

}
//show expected error message
parser.prototype.errorExpected = function(expected)
{
	alert("Error: expected " + expected + " got " + this.token);
}