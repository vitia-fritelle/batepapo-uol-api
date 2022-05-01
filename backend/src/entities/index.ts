import dayjs from 'dayjs';

export class Participant {

    public lastStatus: number;

    constructor(public name: string) {
        this.lastStatus = Date.now();
    }
}

export class Message {

    public time: string;

    constructor(public from: string, public to: string, 
        public text: string, public type: string) {
        this.time = dayjs().format('HH:mm:ss')
    }
}