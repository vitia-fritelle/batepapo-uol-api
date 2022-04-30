export class Participant {

    constructor(public name: string, public lastStatus: number) {

    }
}

export class Message {

    constructor(public from: string, public to: string, 
        public text: string, public type: string, public time: string) {

    }
}